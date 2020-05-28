
function render(eventList, metadata) {
    canvas.clear();
    $("#display").empty();

    if (!metadata.possible) {

        $("#display").append(`Invalid Task List. Try the following things: 
                <ul>
                    <li> Increase CPU Count</li>
                    <li> Decrease Context Switch Overhead</li>
                    <li> Deleting a Job</li>
                    <li> Changing the scheduling algorithm</li>
                    <li> Changing priority of the jobs</li>
                    <li> Changing deadline of the jobs</li>
                    <li> Reducing job time of the jobs</li>
                </ul>
                `);
        return;
    }


    $("#display").append("<h3>Legend</h3>")
    $("#display").append("Blue - CPU is being Used<br>")
    $("#display").append("Yellow - CPU is wasted<br>")
    $("#display").append("Gray - CPU is idle<br>")
    $("#display").append("Red - Job Release Time<br>")
    $("#display").append("<h3>Stats</h3>")

    $("#display").append(`CPU Utilization - ${metadata.cpuUtilization}%<br>`);
    $("#display").append(`CPU Idle - ${metadata.cpuIdle}%<br>`);
    $("#display").append(`CPU Wastage - ${metadata.cpuWastage}%<br>`);
    $("#display").append(`Hyper Period - ${metadata.hyperPeriod}`);


    let jobCount = Object.keys(eventList.jobs).length
    let yCount = jobCount + eventList.cpus.length;

    const margin = 20;
    const offsetX = 100 + margin;
    const offsetY = margin;
    const width = canvas.width - offsetX - margin;
    const height = canvas.height - offsetY - margin - 20;

    const taskMargin = 10;
    const taskHeight = Math.min(100, (height - (yCount - 1) * taskMargin) / yCount);
    const hyperPeriod = metadata.hyperPeriod;

    function x(time) { return width * time / hyperPeriod + offsetX; }
    function y(item) {
        if (typeof item == "string") return metadata.jobIdx[item] * (taskMargin + taskHeight) + offsetY;
        return [item + jobCount] * (taskMargin + taskHeight) + offsetY;
    }

    // Draw Axis
    canvas.setColor("Black");
    canvas.setLineThickness(1);
    canvas.setDrawMode("stroke")
    canvas.drawLine(offsetX, offsetY + height, offsetX + width, offsetY + height); // X Axis
    canvas.drawLine(offsetX, offsetY + height, offsetX, offsetY); // YAxis

    let xAxisTick = Math.ceil(hyperPeriod / 50.0);

    canvas.setColor("rgba(1, 1, 1, 0.2)");
    for (let t = 0; t <= hyperPeriod; t += xAxisTick)
        canvas.drawLine(x(t), offsetY, x(t), offsetY + height + 3);

    for (let i = 0; i < yCount; i++) {
        canvas.drawLine(offsetX, i * (taskHeight + taskMargin) - taskMargin * 0.5 + offsetY, offsetX + width, i * (taskHeight + taskMargin) - taskMargin * 0.5 + offsetY);
    }

    canvas.setColor("black");
    canvas.ctx.textAlign = "center";
    for (let t = 0; t <= hyperPeriod; t += xAxisTick)
        canvas.drawText(x(t), offsetY + height + 15, t, 10);


    canvas.ctx.textAlign = "right";
    for (let job in eventList.jobs) {
        console.log(job);
        canvas.drawText(offsetX - 10, y(job) + taskHeight / 2, job, 20);
    }

    for (let i = 0; i < eventList.cpus.length; i++) {
        canvas.drawText(offsetX - 10, y(i) + taskHeight / 2, `CPU${i}`, 20);
    }


    for (jobId in eventList.jobs) {
        let pos_y = y(jobId);
        let events = eventList.jobs[jobId];
        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            if (event.event == "Release") {
                canvas.setDrawMode("stroke")
                canvas.setColor("Red");
                canvas.setLineThickness(5);
                canvas.drawLine(x(event.time), pos_y, x(event.time), pos_y + taskHeight);
            }

            if (event.event == "Process") {
                // canvas.setDrawMode("fill");
                canvas.setColor("green");
                canvas.ctx.roundRect(x(event.startTime), pos_y, x(event.endTime) - x(event.startTime), taskHeight, 5);
            }
        }
    }

    for (let i = 0; i < eventList.cpus.length; i++) {
        let pos_y = y(i);
        let events = eventList.cpus[i];
        for (let i = 0; i < events.length; i++) {
            let event = events[i];
            canvas.setDrawMode("fill");
            if (event.event == "Idle") {
                canvas.setDrawMode("fill");
                canvas.setColor("grey");
                canvas.drawRectangle(x(event.startTime), pos_y, x(event.endTime) - x(event.startTime), taskHeight);
            }

            if (event.event == "Overhead") {
                canvas.setDrawMode("fill");
                canvas.setColor("yellow");
                canvas.drawRectangle(x(event.startTime), pos_y, x(event.endTime) - x(event.startTime), taskHeight);
            }

            if (event.event == "Process") {

                canvas.setColor("blue");
                canvas.drawRectangle(x(event.startTime), pos_y, x(event.endTime) - x(event.startTime), taskHeight);
            }
        }
    }



}