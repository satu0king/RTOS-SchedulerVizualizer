# RTOS-SchedulerVizualizer

Scheduling is core to any real time system. In this project we will explore 3 popular real time scheduling algorithms.

* RMS (Rate-monotonic Scheduling)
* EDF (Earliest Deadline First Scheduling)
* Fixed Priority (Fixed Priority scheduling algorithm)

Both RMS and Fixed Priority scheduling algorithms are static priority scheduling algorithms. EDF on the other hand is dynamic priority scheduling algorithm.

![Main](/images/main.png)

## Try it Out!

Try it out by heading to [RTOS-SchedulerVizualizer](https://satu0king.github.io/RTOS-SchedulerVizualizer/). 

### Things to try:

1. Increase number of jobs
1. Change the time period and note how hyper period changes
1. Change deadline and job times 
1. Change number of CPUs and see how the algorithm works
1. Try different algorithms in different scenarios and see which one works better in which scenario

## Implementation

### Visualization
The rendering has been done completely from scratch using a basic canvas wrapper I wrote: [Canvas Wrapper](https://github.com/zense/Canvas-Competition). The visualization code can be found at `render.js`. It has been written independently from the scheduling algorithms to enable reuse. 

The render function takes an event list as follows.
```
{
    "jobs": {
        "Job 2":[{"event":"Release","time":0},
                 {"event":"Process","startTime":1,"endTime":6}]
        },
    "cpus":[
        [{"event":"Overhead","startTime":0,"endTime":1},
        {"event":"Process","startTime":1,"endTime":6}, 
        {"event":"Idle","startTime":6,"endTime":50}]
    ]
}
```

Note that the events for the jobs and CPUs are different.

Overhead event (context switch) (CPU Only)
```
{
    event: "Overhead",
    startTime: 0,
    endTime: 1
}
```
Job Release Event (Job only)
```
{
    event: "Release",
    time: 10
}
```

Job Process Event (Job + CPU)
```
{
    event: "Process",
    startTime: this.cpu.currentTime,
    endTime: endTime,
}
```


CPU Idle Event (CPU only)
```
{
    event: "Process",
    startTime: this.cpu.currentTime,
    endTime: endTime,
}
```

Any new scheduling algorithm can produce a similar event list which can be rendered easily.

### Core Structures 

Some core structures have been implemented to support scheduling elegantly. These structures update the event list automatically when actions are executed. These structures are also independent of the scheduling algorithm and is intended for reuse. The code can be found at `core.js`.

#### class Job 
This classrepresents a job in the runqueue. A job can be assigned to a CPU. During a context switch, the job is unassigned from the CPU. The states of a Job are Release, Waiting, Processing, Completed. Job objects maintains context information like CPU, remaining time, job id and also other metadata like priority, time period, deadline etc.

#### class CPU
This class represents one thread of execution. At at time at max one job can be executed at the CPU. The states of the CPU are Idle, Processing or Context Switching. Each CPU object maintains its own time information.

#### class RunQueue
This class represents the current active list of pending jobs waiting to be executed. It is essentially a priority queue and the priority function is parametrized. Therefore the RunQueue can be used with different algorithms


### Scheduling 

The `Scheduler` class is the core of the scheduling algorithm. The constructor of the class prepares the task list for the scheduling. When `process()` is called, the scheduler "simulates" the scheduling algorithm. The scheduler maintains time and adds jobs from the task list into the runQueue as time passes. When a job is added to the runQueue, the scheduler assigns the job to a free CPU if available. If no free CPU is available but a lower priority job is being executed on one of the CPU, then that job is preempted and the new job is assigned. 

The code can be found at `schedulers.js`

### Supporting different scheduling algorithms
The amazing part of this elegant implementation is that different scheduling algorithms can be easily implemented by just tweaking the priority functions. The follow are the priority functions for RMS, EDF and Static Fixed Priority algorithm.
```
// returns if priority a > priority b
function RMS_Fn(a, b) { 
    if(a.period != b.period)
        return b.period - a.period;
    return b.startTime - a.startTime;
}

function Priority_Fn(a, b) { 
    return b.idx - a.idx; // idx is the fixed priority
}

function EDF_Fn(a, b) { 
    if(a.deadline != b.deadline) 
        return b.deadline - a.deadline;
    return b.startTime - a.startTime 
}
```


## References
* [Fixed Priority pre-emptive scheduling](https://en.wikipedia.org/wiki/Fixed-priority_pre-emptive_scheduling)
* [Rate-monotonic scheduling (RMS)](https://en.wikipedia.org/wiki/Rate-monotonic_scheduling)
* [Earliest Deadline First scheduling (EDF)](https://en.wikipedia.org/wiki/Earliest_deadline_first_scheduling)

