
class Job {
    constructor(task, scheduler) {
        this.name = task.name;
        this.startTime = task.start;
        this.deadline = task.deadline;
        this.time = task.time;
        this.period = task.period;
        this.idx = task.idx;
        this.cpu = undefined;
        this.scheduler = scheduler;
        this.eventList = scheduler.eventList;
        this.eventList.jobs[this.name].push({
            event: "Release",
            time: task.start,
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

        let endTime = this.cpu.currentTime + timeUsed;

        this.eventList.jobs[this.name].push({
            event: "Process",
            startTime: this.cpu.currentTime,
            endTime: endTime,
        });

        this.cpu.addUsage(timeUsed);

        this.cpu = undefined;

        if (this.time)
            this.scheduler.runQueue.addJob(this);
        else if (endTime > this.deadline)
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


    constructor(sortFn) {
        this.queue = [];
        this.sortFn = sortFn;
    }

    addJob(job) {
        this.queue.push(job);
        this.queue.sort(this.sortFn)
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

    peekNextJob() {
        assert(this.hasItem());
        return this.queue[this.queue.length - 1];
    }

    // Returns if priority of A > priority of B
    comparePriority(jobA, jobB) {
        return this.sortFn(jobA, jobB) > 0;
    }
}