class CPU {
    constructor(contextSwithTime, jobQueue) {
        this.contextSwithTime = contextSwithTime;
        this.currentTime = 0;

    }
}

class RunQueue {
    constructor() {
        this.queue = [];
    }

    addJob(job) {
        this.queue.push(job);
        this.queue.sort(function (a, b) { return a.period != b.period ? b.period - a.period : b.start - a.start })
    }

    hasItem() {
        return this.queue.length > 0;
    }

    getNextJob() {
        return this.queue.pop();
    }
}