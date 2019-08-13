var data = {};
var timeObject = {};
var adObject = {};
var countObject = {};
var nfrObject = {};

var timeTypes = [];
var tempTimeTypes = [];
var nfrTypes = [];
var adTypes = [];

function readCSV() {
    d3.csv("/ad_analysis.csv").then(function (readData) {
        for (var index in readData) {
            if (readData[index].time === "") break;
            data[index] = readData[index];
            timeObject[index] = data[index]["time"];
            adObject[index] = data[index]["ad"];
            countObject[index] = data[index]["count"];
            nfrObject[index] = data[index]["nfr"]
        }
    });
}

function load() {
    if (document.getElementById("loadWrapper")) {
        document.getElementById("load").style.display = "none";
        var loadSign = document.createElement("p");
        loadSign.innerText = "Loading...";
        loadSign.id = "loadingText";
        document.getElementById("loadWrapper").appendChild(loadSign);
    }
    readCSV();
    setTimeout(function () {
        render()
    }, 500);
}

function createDateSelection() {
    for (var i in timeTypes) {
        var wrapper = document.createElement("ul");
        var box = document.createElement("input");
        box.id = timeTypes[i] + "-checkBox";
        box.type = "checkbox";
        box.checked = true;
        wrapper.innerText = timeTypes[i];
        wrapper.style.display = "inline-block";
        box.setAttribute("onchange", "getFilteredDates()");
        wrapper.appendChild(box);
        document.getElementById("filter").appendChild(wrapper);
    }
}

function render() {
    timeTypes = getUnique(Object.values(timeObject));
    tempTimeTypes = timeTypes;
    nfrTypes = getUnique(Object.values(nfrObject));
    adTypes = getUnique(Object.values(adObject));
    createDateSelection();
    renderSelectedDates(Object.values(getFilteredDayBasedData()));
}

function getFilteredDates() {
    timeTypes = [];
    for (var i = 0; i <= document.getElementById("filter").childElementCount - 1; i++) {
        var checkBoxSelected = document.getElementById(tempTimeTypes[i] + "-checkBox").checked;
        if (checkBoxSelected) timeTypes.push(tempTimeTypes[i])
    }
    if (timeTypes.length === 0) {
        if (document.getElementById("loadingText")) document.getElementById("loadingText").innerText = "Please Select a Date:";
        if (document.getElementById("svgElement")) document.getElementById("svgElement").remove();
    } else {
        var resultData = Object.values(getFilteredDayBasedData());
        renderSelectedDates(resultData);
    }
}

function getFilteredDayBasedData() {
    var uniqueTimeObject = getUnique(Object.values(timeObject));
    var dayBasedData = {};
    for (var i in timeTypes) {
        for (var j in uniqueTimeObject) {
            if (uniqueTimeObject[j] === timeTypes[i]) {
                var singleDateEntry = getSingleDateData(uniqueTimeObject[j]);//
                dayBasedData[i] = {
                    "time": timeTypes[i],
                    "AD_INV_SRC_TYPE":singleDateEntry[0]["cost"],
                    "AD_SUPPLY_INC_EXC": singleDateEntry[1]["cost"],
                    "BIDDER_FLOOR_UNMET": singleDateEntry[2]["cost"],
                    "DEVICE_TYPE": singleDateEntry[3]["cost"],
                    "FILL": singleDateEntry[4]["cost"],
                    "LOST_TO_COMPETITION": singleDateEntry[5]["cost"],
                    "NO_ADS_COUNTRY_CARRIER_OS_BRAND": singleDateEntry[6]["cost"],
                    "SITE_AD_DOMAIN": singleDateEntry[7]["cost"],
                    "CAMPAIGN_DATE_BUDGET": singleDateEntry[8]["cost"],
                    "CAMPAIGN_NOT_FOUND": singleDateEntry[9]["cost"],
                    "CREATIVE_FORMAT_ERROR": singleDateEntry[10]["cost"],
                    "AD_SITE_HYGIENE": singleDateEntry[11]["cost"]
                }
            }
        }
    }
    return dayBasedData
}

function getSingleDateData(date) {
    var singleDateEntries = [];
    var singleDateResults = [];
    for (var i in data) {
        if (data[i]["time"] === date) {
            singleDateEntries.push({
                "time": date,
                "nfr": data[i]["nfr"],
                "count": data[i]["count"],
                "ad": data[i]["ad"]
            })
        }
    }
    for (var k in nfrTypes) {
        var cost = 0;
        var count=0;
        for (var j in singleDateEntries) {
            if (singleDateEntries[j]["nfr"] === nfrTypes[k]) {
                for (var l in adTypes) {
                    if (singleDateEntries[j]["ad"] === adTypes[l]) {
                        count= count + parseInt(singleDateEntries[j]["count"]);
                        cost = cost + parseInt(singleDateEntries[j]["count"]) * (parseFloat(adTypes[l].slice(adTypes[l].indexOf("$") + 1, adTypes[l].indexOf("$") + 4)))
                    }
                }
            }
        }
        singleDateResults.push({"time": singleDateEntries[0]["time"], "nfr": nfrTypes[k], "cost": count+","+cost});
    }
    return singleDateResults
}

function getUnique(array) {
    return array.reduce(function (a, b) {
        if (a.indexOf(b) < 0) a.push(b);
        return a;
    }, []);
}

function renderSelectedDates(resultData) {
    console.log(resultData);
    if (document.getElementById("loadingText")) document.getElementById("loadingText").innerText = "";
    if (document.getElementById("svgElement")) document.getElementById("svgElement").remove();

    //set dimensions to chart
    var stackChartMargin = {right: 10, top: 40, left: 60, bottom: 40},
        stackChartWidth = 1300 - stackChartMargin.left - stackChartMargin.right,
        stackChartHeight = 850 - stackChartMargin.top - stackChartMargin.bottom;

    //distribute entries over chart
    var stackChartX = d3.scaleLinear()
        .range([0, stackChartWidth - 600]);
    var stackChartY = d3.scaleBand()
        .range([stackChartHeight-100, 0])
        .padding(0.3);


    //set color to stacks
    var colorStackChart = d3.scaleOrdinal(d3["schemePaired"]);

    //create chart
    var canvasStackChart = d3.select("#Graph").append("svg")
        .attr("id", "svgElement")
        .attr("width", stackChartWidth + stackChartMargin.left + stackChartMargin.right)
        .attr("height", stackChartHeight + stackChartMargin.top + stackChartMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + stackChartMargin.left + "," + stackChartMargin.top + ")");

    //get Domain for AdTypes
    colorStackChart.domain(d3.keys(resultData[0]).filter(function (key) {
        return key !== "time";
    }));

    //get Height of each stack and its components
    resultData.forEach(function (d) {
        var base = 0;
        d.cost = colorStackChart.domain().map(function (ad) {
            return {ad: ad, base: base, peak: base += +d[ad].slice(0,d[ad].indexOf(",")), value:d[ad].slice(d[ad].indexOf(",")+1,d[ad].length), time: d.time};
        });
        d.total = d.cost[d.cost.length - 1].peak;
    });

    //Place last date first
    resultData.reverse();

    //Define domain Mapping (height and width of stack)
    stackChartY.domain(resultData.map(function (d) {
        return d.time;
    }));
    stackChartX.domain([0, d3.max(resultData, function (d) {
        return d.total;
    })]);

    //create X-Axis
    canvasStackChart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (stackChartHeight-100) + ")")
        .call(d3.axisBottom(stackChartX))
        .selectAll("text")
        .style("text-anchor", "start")
        .attr("y",3)
        .attr("x",15)
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        //.attr("y",stackChartHeight)
        .attr("transform", "rotate(90)");

    //add Label to X-Axis
    canvasStackChart.append("text")
        .attr("transform", "translate(" + ((stackChartWidth - 600) / 2) + " ," + (stackChartHeight-50 + stackChartMargin.top) + ")")
        .style("text-anchor", "middle")
        .text("Count");

    //create Y-axis
    canvasStackChart.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(stackChartY))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em");

    //add Label to Y-Axis
    canvasStackChart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - stackChartMargin.left - 5)
        .attr("x", 0 - ((stackChartHeight-100) / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Date");

    //add position for single stack entry
    var date = canvasStackChart.selectAll(".time")
        .data(resultData)
        .enter().append("g")
        .attr("class", "g")
        .attr("transform", function (d) {
            return "translate(0," + stackChartY(d.time) + ")";
        });

    //define single stack entry
    date.selectAll("rect")
        .data(function (d) {
            return d.cost;
        })
        .enter().append("rect")
        .attr("height", Math.min(stackChartY.bandwidth(), 100))
        .attr('transform', function(d){
            if(Math.min(stackChartY.bandwidth(),100)===100) return 'translate(0,' + (stackChartY.bandwidth() - 100) / 2 + ')';
            else return null
        })
        .attr("x", function (d) {
            return stackChartX(d.base);
        })
        .attr("width", function (d) {
            return stackChartX(d.peak) - stackChartX(d.base);
        })
        .style("fill", function (d) {
            return colorStackChart(d.ad);
        })
        .on("mouseover", function () {
            tooltip.style("display", null);
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        })
        .on("mousemove", function (d) {
            var xPosition = d3.event.pageX - 60;
            var yPosition = d3.event.pageY - 80;
            tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
            tooltip.select("text").html("Date: " + d.time + ", Nfr: " + d.ad + ", Value: " + d.value);
        });

    //add position for legends
    var legend = canvasStackChart.selectAll(".legend")
        .data(colorStackChart.domain().slice().reverse())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function (d, i) {
            return "translate(0," + i * 20 + ")";
        });

    //display color values to legend
    legend.append("rect")
        .attr("x", stackChartWidth - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colorStackChart);

    //add text to legend
    legend.append("text")
        .attr("x", stackChartWidth - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function (d) {
            return d;
        });

    //add tooltip
    var tooltip = canvasStackChart.append("g")
        .attr("class", "tooltip")
        .attr("transform", "rotate(-90)")
        .style("display", "none");

    tooltip.append("rect")
        .style("opacity", 0.5);

    tooltip.append("text")
        .attr("dy", "1.2em")
        .style("text-anchor", "start")
        .style("color", "#ff9300")
        .attr("font-size", "15px")

}

