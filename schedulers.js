function assert(assertion, message = "") {
    if (assertion) return;
    throw new Error(message);
}

// returns a > b
function RMS_Fn(a, b) { return a.period != b.period ? b.period - a.period : b.startTime - a.startTime }
function Priority_Fn(a, b) { return b.idx - a.idx; }
function EDF_Fn(a, b) { return a.deadline != b.deadline ? b.deadline - a.deadline : b.startTime - a.startTime }

const SchedulerFunction = {
    RMS: RMS_Fn,
    PRIORITY: Priority_Fn,
    EDF: EDF_Fn
}

class Scheduler {
    constructor(overhead, threadCount, jobList, hyperperiod, schedulerFn) {

        let taskList = [];

        for (let i = 0; i < jobList.length; i++) {
            let time = jobList[i].time;
            let period = jobList[i].period;
            let name = jobList[i].name;
            if (hyperperiod <= 0)
                throw new Error("Invalid hyperperiod");

            let deadlineTime = jobList[i].deadline ? jobList[i].deadline : period;

            for (let t = 0; t < hyperperiod; t += period) {
                taskList.push({
                    name: name,
                    start: t,
                    deadline: t + deadlineTime,
                    time: time,
                    period: period,
                    idx: i
                });
            }
        }
        taskList.sort((a, b) => { return a.start - b.start });
        console.log(taskList);

        this.runQueue = new RunQueue(schedulerFn);
        this.schedulerFn = schedulerFn;
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
                if (this.taskList[idx].start < t)
                    throw new Error("Algo fail");
                let task = this.taskList[idx++];
                this.runQueue.addJob(new Job(task, this));
            }

            while (this.runQueue.hasItem()) {
                let bestCPU = 0;
                let assigned = false;
                let nextJob = this.runQueue.peekNextJob();

                for (let i = 0; i < this.threadCount; i++) {
                    if (!this.cpus[i].isBusy()) {
                        this.cpus[i].startNextJob(t);
                        assigned = true;
                        break;
                    }

                    if (this.runQueue.comparePriority(this.cpus[bestCPU].currentJob, this.cpus[i].currentJob))
                        bestCPU = i;
                }

                if (!assigned && this.runQueue.comparePriority(nextJob, this.cpus[bestCPU].currentJob)) {
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



