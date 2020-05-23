function assert(assertion, message = "") {
    if (assertion) return;
    throw new Error(message);
}

class Scheduler {
    constructor(overhead, threadCount, jobList, hyperperiod) {

        let taskList = [];

        for (let i = 0; i < jobList.length; i++) {
            let time = jobList[i].time;
            let period = jobList[i].period;
            let name = jobList[i].name;
            if (hyperperiod <= 0)
                throw new Error("Invalid hyperperiod");

            for (let i = 0; i < hyperperiod; i += period) {
                taskList.push({
                    name: name,
                    start: i,
                    deadline: i + period,
                    time: time,
                    period: period
                });
            }
        }
        taskList.sort((a, b) => { return a.start == b.start ? a.period - b.period : a.start - b.start })

        this.runQueue = new RunQueue();
        this.taskList = taskList;
        this.overhead = overhead;
        this.threadCount = threadCount;
        this.hyperperiod = hyperperiod;

        this.eventList = {
            jobs: {},
            cpus: []
        }

        this.cpus = [];
        for (let i = 0; i < threadCount; i++) {
            this.eventList.cpus.push(new Array());
            this.cpus.push(new CPU(this, i));
        }

        for (let i = 0; i < jobList.length; i++)
            this.eventList.jobs[jobList[i].name] = [];
    }

    process() {

        let t = 0;
        let idx = 0;
        this.valid = true;

        while (t < this.hyperperiod && (idx < this.taskList.length || this.runQueue.hasItem()) && this.valid) {
            for (let i = 0; i < this.threadCount; i++)
                this.cpus[i].process(t);

            while (idx < this.taskList.length && this.taskList[idx].start <= t) {
                if(this.taskList[idx].start < t)
                    throw new Error("Algo fail");
                let task = this.taskList[idx++];
                this.runQueue.addJob(new Job(task.name, task.start, task.deadLine, task.time, task.period, this));
            }

            while (this.runQueue.hasItem()) {
                let bestPeriod = this.runQueue.getBestPeriod();
                let bestCPU = 0;
                let assigned = false;
                for (let i = 0; i < this.threadCount; i++) {
                    if (!this.cpus[i].isBusy()) {
                        this.cpus[i].startNextJob(t);
                        assigned = true;
                        break;
                    }

                    let period = this.cpus[i].period();
                    if (period > this.cpus[bestCPU].period())
                        bestCPU = i;
                }

                if (!assigned && this.cpus[bestCPU].period() > bestPeriod) {
                    this.cpus[bestCPU].startNextJob(t);
                    assigned = true;
                }
                if (!assigned) {
                    break;
                }
            }

            let nextTime = -1;

            for (let i = 0; i < this.threadCount; i++) {
                let cpu = this.cpus[i];
                if (cpu.isBusy()) {
                    if (~nextTime)
                        nextTime = Math.min(nextTime, cpu.nextTime());
                    else
                        nextTime = cpu.nextTime();
                }
            }

            if (idx < this.taskList.length) {
                let time = this.taskList[idx].start;
                if (~nextTime)
                    nextTime = Math.min(nextTime, time);
                else
                    nextTime = time;
            }

            if (nextTime == -1) break;

            t = nextTime;
        }

        console.log(this.valid);

        for (let i = 0; i < this.threadCount; i++) {
            this.cpus[i].process(this.hyperperiod);
            this.cpus[i].complete(this.hyperperiod);
            if (this.cpus[i].isBusy())
                this.valid = false;
        }
        console.log(this.valid);

        if (idx != this.taskList.length)
            this.valid = false;

        console.log(this.valid, t, idx, this.taskList.length);

        if (this.runQueue.hasItem())
            this.valid = false;

        console.log(this.valid);

        return this.eventList;
    }
};

class Job {
    constructor(name, startTime, deadLine, time, period, scheduler) {
        this.name = name;
        this.startTime = startTime;
        this.deadLine = deadLine;
        this.time = time;
        this.period = period;
        this.cpu = undefined;
        this.scheduler = scheduler;
        this.eventList = scheduler.eventList;
        this.eventList.jobs[this.name].push({
            event: "Release",
            time: startTime,
        });
    }

    assignCPU(cpu) {
        assert(this.cpu == undefined);
        this.cpu = cpu;
    }

    releaseCPU(time) {
        assert(this.cpu);
        let timeUsed = time - this.cpu.currentTime;
        timeUsed = Math.min(timeUsed, this.time);
        this.time -= timeUsed;

        this.eventList.jobs[this.name].push({
            event: "Process",
            startTime: this.cpu.currentTime,
            endTime: this.cpu.currentTime + timeUsed,
        });

        this.cpu.addUsage(timeUsed);

        this.cpu = undefined;

        if (this.time)
            this.scheduler.runQueue.addJob(this);
        else if (time > this.deadLine)
            this.scheduler.valid = false;
    }

}

class CPU {
    constructor(scheduler, id) {
        this.overhead = scheduler.overhead;
        this.currentTime = 0;
        this.runQueue = scheduler.runQueue;
        this.eventList = scheduler.eventList;
        this.currentJob = undefined;
        this.id = id;
        this.idleTime = 0;
        this.processTime = 0;
        this.overheadTime = 0;
    }

    releaseJob(time) {
        assert(time >= this.currentTime);
        assert(this.isBusy());

        this.currentJob.releaseCPU(time);
        this.currentJob = undefined;

        this.addIdle(time - this.currentTime);
    }

    startNextJob(time) {
        assert(this.runQueue.hasItem());
        if (this.isBusy())
            this.releaseJob(time);

        this.startJob(time, this.runQueue.getNextJob());
    }

    period() {
        assert(this.isBusy());
        return this.currentJob.period;
    }

    startJob(time, job) {
        assert(time >= this.currentTime, `${time} is later than ${this.currentTime}`);

        if (this.isBusy())
            this.releaseJob();

        this.addIdle(time - this.currentTime);
        this.addOverHead();

        this.currentJob = job;
        job.assignCPU(this);
    }

    isBusy() {
        return this.currentJob != undefined;
    }

    nextTime() {
        assert(this.isBusy());
        return this.currentTime + this.currentJob.time;
    }

    addUsage(time) {
        if (time)
            this.eventList.cpus[this.id].push({
                event: "Process",
                startTime: this.currentTime,
                endTime: this.currentTime + time
            });
        this.currentTime += time;
        this.processTime += time;
    }

    addIdle(time) {
        if (time)
            this.eventList.cpus[this.id].push({
                event: "Idle",
                startTime: this.currentTime,
                endTime: this.currentTime + time
            });
        this.currentTime += time;
        this.idleTime += time;
    }

    complete(time) {
        this.addIdle(time - this.currentTime);
    }

    addOverHead() {
        if (this.overhead)
            this.eventList.cpus[this.id].push({
                event: "Overhead",
                startTime: this.currentTime,
                endTime: this.currentTime + this.overhead
            });
        this.currentTime += this.overhead;
        this.overheadTime += this.overhead;
    }

    process(time) {

        if (this.isBusy()) {
            if (this.nextTime() <= time)
                this.releaseJob(time);
        }
    }
}

class RunQueue {
    constructor() {
        this.queue = [];
    }

    addJob(job) {
        this.queue.push(job);
        this.queue.sort(function (a, b) { return a.period != b.period ? b.period - a.period : b.startTime - a.startTime })
    }

    hasItem() {
        return this.queue.length > 0;
    }

    getBestPeriod() {
        assert(this.hasItem());
        return this.queue[this.queue.length - 1].period;
    }

    getNextJob() {
        return this.queue.pop();
    }
}