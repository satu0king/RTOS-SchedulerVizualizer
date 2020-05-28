

var jobCount = 0;
function newJob() {
    jobCount++;
    let newTask =
        `<li class="ui-state-default" id = "job${jobCount}">
              <div class = "task">
                <span class="ui-icon ui-icon-arrowthick-2-n-s"></span>
                  Name: <input type="text" name ="name" id = 'name' value = "Job ${jobCount}" onchange="updateJobList();"> </input>
                  Period: <input type="number" name = "period" value = "50"  min = "1" onchange="updateJobList();"> </input>
                  Job Time: <input type="number" name = "time" value = "10"  min = "1" onchange="updateJobList();"> </input>
                  Deadline: <input type="number" name = "deadline" min = "0" value = "0" onchange="updateJobList();"> </input>
                  <button onClick="$('#job${jobCount}').remove();updateJobList();"> X</button>
              </div>
            </li>`
    $('.taskList').append(newTask);

    updateJobList();

}

function updateJobList() {
    let jobList = []
    $(".task").each(function (idx, li) {

        jobList.push({
            name: $(li).children('input[name="name"]').val(),
            time: parseInt($(li).children('input[name="time"]').val()),
            period: parseInt($(li).children('input[name="period"]').val()),
            deadline: parseInt($(li).children('input[name="deadline"]').val())
        })
        // and the rest of your code
    });

    let overhead = parseInt($('input[name="contextOverHead"]').val());
    let threadCount = parseInt($('input[name="threadCount"]').val());

    console.log(jobList);

    generateSchedule(jobList, overhead, threadCount);

}

function generateSchedule(jobList, overhead, threadCount) {
    let hyperPeriod = 1;

    let jobIdx = {}

    for (let i = 0; i < jobList.length; i++) {
        hyperPeriod = lcm(hyperPeriod, jobList[i].period);
        jobIdx[jobList[i].name] = i;
    }

    let metadata = {}
    metadata.hyperPeriod = hyperPeriod;
    metadata.jobIdx = jobIdx;
    metadata.jobList = jobList;

    let schedulerFn = SchedulerFunction[document.getElementById("algo").value];
    let scheduler = new Scheduler(overhead, threadCount, jobList, hyperPeriod, schedulerFn);
    let eventList = scheduler.process();
    console.log(JSON.stringify(eventList));

    let cpuTime = hyperPeriod * threadCount;
    let processTime = 0;
    let idleTime = 0;
    let overheadTime = 0;
    for (let i = 0; i < threadCount; i++) {
        processTime += scheduler.cpus[i].processTime;
        overheadTime += scheduler.cpus[i].overheadTime;
        idleTime += scheduler.cpus[i].idleTime;
    }

    metadata.cpuUtilization = Math.round(processTime * 10000.0 / cpuTime) / 100.0;
    metadata.cpuWastage = Math.round(overheadTime * 10000.0 / cpuTime) / 100.0;
    metadata.cpuIdle = Math.round(idleTime * 10000.0 / cpuTime) / 100.0;
    metadata.hyperPeriod = hyperPeriod;

    metadata.possible = scheduler.valid;
    render(eventList, metadata);
}

function lcm(x, y) {
    if ((typeof x !== 'number') || (typeof y !== 'number'))
        return false;
    return (!x || !y) ? 0 : Math.abs((x * y) / gcd(x, y));
}

function gcd(x, y) {
    x = Math.abs(x);
    y = Math.abs(y);
    while (y) {
        var t = y;
        y = x % y;
        x = t;
    }
    return x;
}
