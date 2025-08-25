// Firebase config
const FIREBASE_URL = "https://siot-de2025-default-rtdb.europe-west1.firebasedatabase.app/data/combined_data_upload";

let currentData = null;
let availableDates = [];
let currentDateIndex = 0;
let currentView = "daily";
let weeklyData = null;
let currentWeekIndex = 0;
let availableWeeks = [];

// Load available dates on page load
window.onload = function() {
    loadAvailableDates();
};

async function loadAvailableDates() {
    console.log("Loading available dates...");
    try {
        const response = await fetch(`${FIREBASE_URL}.json`);
        const data = await response.json();

        console.log("Firebase response:", data);

        if (!data) {
            console.log("No data found");
            document.getElementById("currentDate").textContent = "No data available";
            return;
        }

        // unix to dates
        const timestamps = Object.keys(data);
        const dates = timestamps.map(ts => {
            const date = new Date(parseInt(ts));
            return date.toISOString().split("T")[0];
        });

        availableDates = [...new Set(dates)].sort().reverse();
        currentDateIndex = 0;
        generateWeeks();
        console.log("Dates loaded:", availableDates);
        console.log("Weeks generated:", availableWeeks.length);
        // autoload the latest data
        updateDateNavigation();
        loadData();
    } catch (error) {
        console.error("Error loading dates:", error);
        document.getElementById("currentDate").textContent = "Error loading dates";
    }
}

function updateDateNavigation() {
    if (availableDates.length === 0) return;
    // stop the buttons being broken
    document.getElementById("currentDate").textContent = availableDates[currentDateIndex];
    document.getElementById("prevDate").disabled = currentDateIndex >= availableDates.length - 1;
    document.getElementById("nextDate").disabled = currentDateIndex <= 0;
}

function navigateDate(direction) {
    if (availableDates.length === 0) return;

    const newIndex = currentDateIndex + direction;

    if (newIndex >= 0 && newIndex < availableDates.length) {
        currentDateIndex = newIndex;
        updateDateNavigation();
        loadData();
    }
}

async function loadData() {
    if (availableDates.length === 0 || currentDateIndex < 0 || currentDateIndex >= availableDates.length) return;

    const selectedDate = availableDates[currentDateIndex];
    console.log("Loading data for:", selectedDate);
    document.getElementById("loadingMessage").style.display = "block";

    try {
        const response = await fetch(`${FIREBASE_URL}.json`);
        const allData = await response.json();

        if (!allData) {
            console.log("No data found");
            return;
        }

        // filter
        const dayData = Object.entries(allData).filter(([timestamp, values]) => {
            const date = new Date(parseInt(timestamp));
            return date.toISOString().split('T')[0] === selectedDate;
        });

        // so chart doesnt break
        currentData = dayData.map(([timestamp, values]) => ({
            time: new Date(parseInt(timestamp)),
            ...values
        })).sort((a, b) => a.time - b.time);

        console.log("Filtered data points:", currentData.length);
        document.getElementById("loadingMessage").style.display = "none";

        updateStats();
        updateChart();
        updateCorrelationChart();

    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById("loadingMessage").style.display = "none";
    }
}

function updateStats() {
    if (!currentData || currentData.length === 0) {
        document.getElementById("statsGrid").innerHTML = "<p>No data available for selected date.</p>";
        return;
    }

    const avgHeartRate = calculateAverage("heartRateValue");
    const avgHRV = calculateAverage("hrvValue");
    const sleepDuration = (currentData.length / 60).toFixed(1);
    const avgTemp = calculateAverage("temperatureValue");
    const avgMovement = calculateAverage("movementValue");
    const avgRespiration = calculateAverage("respirationValue");
    const avgHumidity = calculateAverage("humidityValue");
    const avgPressure = calculateAverage("pressureValue");
    const totalPrecipitation = currentData.reduce((sum, d) => sum + (d.precipitationValue || 0), 0).toFixed(1);

    const statsHTML = `
        <div class="stat-card">
            <h3>Sleep Duration</h3>
            <p>${sleepDuration} hours</p>
        </div>
        <div class="stat-card">
            <h3>Avg Heart Rate</h3>
            <p>${avgHeartRate} bpm</p>
        </div>
        <div class="stat-card">
            <h3>Avg HRV</h3>
            <p>${avgHRV}</p>
        </div>
        <div class="stat-card">
            <h3>Avg Temperature</h3>
            <p>${avgTemp}°C</p>
        </div>
        <div class="stat-card">
            <h3>Avg Movement</h3>
            <p>${avgMovement}</p>
        </div>
        <div class="stat-card">
            <h3>Avg Respiration</h3>
            <p>${avgRespiration} bpm</p>
        </div>
        <div class="stat-card">
            <h3>Avg Humidity</h3>
            <p>${avgHumidity}%</p>
        </div>
        <div class="stat-card">
            <h3>Avg Pressure</h3>
            <p>${avgPressure} hPa</p>
        </div>
        <div class="stat-card">
            <h3>Total Precipitation</h3>
            <p>${totalPrecipitation} mm</p>
        </div>
    `;

    document.getElementById("statsGrid").innerHTML = statsHTML;
}

function calculateAverage(field) {
    if (!currentData || currentData.length === 0) return "N/A";

    const values = currentData.filter(d => d[field] != null && !isNaN(d[field])).map(d => d[field]);
    if (values.length === 0) return "N/A";

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return avg.toFixed(1);
}

function updateChart() {
    if (!currentData || currentData.length === 0) {
        console.log("No data to chart");
        return;
    }

    const ctx = document.getElementById("sleepChart").getContext("2d");

    // not sure this is even needed anymore
    if (window.sleepChart instanceof Chart) {
        window.sleepChart.destroy();
    }

    window.sleepChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: currentData.map(d => d.time),
            datasets: [
                {
                    label: "Heart Rate (bpm)",
                    data: currentData.map(d => d.heartRateValue),
                    borderColor: "rgb(220, 53, 69)",
                    backgroundColor: "rgba(220, 53, 69, 0.1)",
                    yAxisID: "y1",
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Humidity (%)",
                    data: currentData.map(d => d.humidityValue),
                    borderColor: "rgb(23, 162, 184)",
                    backgroundColor: "rgba(23, 162, 184, 0.1)",
                    yAxisID: "y7",
                    tension: 0.2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Pressure (hPa)",
                    data: currentData.map(d => d.pressureValue),
                    borderColor: "rgb(111, 66, 193)",
                    backgroundColor: "rgba(111, 66, 193, 0.1)",
                    yAxisID: "y8",
                    tension: 0.2,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Precipitation (mm)",
                    data: currentData.map(d => d.precipitationValue),
                    borderColor: "rgb(32, 201, 151)",
                    backgroundColor: "rgba(32, 201, 151, 0.1)",
                    yAxisID: "y9",
                    tension: 0.2,
                    borderDash: [10, 2],
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Movement",
                    data: currentData.map(d => d.movementValue),
                    borderColor: "rgb(255, 193, 7)",
                    backgroundColor: "rgba(255, 193, 7, 0.1)",
                    yAxisID: "y2",
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "HRV",
                    data: currentData.map(d => d.hrvValue),
                    borderColor: "rgb(40, 167, 69)",
                    backgroundColor: "rgba(40, 167, 69, 0.1)",
                    yAxisID: "y3",
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Respiration (bpm)",
                    data: currentData.map(d => d.respirationValue),
                    borderColor: "rgb(0, 123, 255)",
                    backgroundColor: "rgba(0, 123, 255, 0.1)",
                    yAxisID: "y4",
                    tension: 0.2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Temperature (°C)",
                    data: currentData.map(d => d.temperatureValue),
                    borderColor: "rgb(108, 117, 125)",
                    backgroundColor: "rgba(108, 117, 125, 0.1)",
                    yAxisID: "y5",
                    tension: 0.2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: "Sleep Stage",
                    data: currentData.map(d => d.sleepStage),
                    borderColor: "rgb(102, 16, 242)",
                    backgroundColor: "rgba(102, 16, 242, 0.1)",
                    yAxisID: "y6",
                    stepped: true,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "hour",
                        displayFormats: {
                            hour: "HH:mm"
                        }
                    },
                    title: {
                        display: true,
                        text: "Time"
                    }
                },
                y1: {
                    type: "linear",
                    position: "left",
                    display: false
                },
                y2: {
                    type: "linear",
                    position: "left",
                    display: false
                },
                y3: {
                    type: "linear",
                    position: "right",
                    display: false,
                    grid: {
                        drawOnChartArea: false,
                    }
                },
                y4: {
                    type: "linear",
                    position: "right",
                    display: false
                },
                y5: {
                    type: "linear",
                    position: "right",
                    display: false
                },
                y6: {
                    type: "linear",
                    position: "right",
                    display: false
                },
                y7: {
                    type: "linear",
                    position: "right",
                    display: false
                },
                y8: {
                    type: "linear",
                    position: "right",
                    display: false
                },
                y9: {
                    type: "linear",
                    position: "right",
                    display: false
                }
            },
            plugins: {
                legend: {
                    position: "top",
                },
                title: {
                    display: true,
                    text: "Sleep Metrics Over Time"
                }
            }
        }
    });
}

function updateCorrelationChart() {
    if (!currentData || currentData.length === 0) {
        console.log("No data to correlate");
        return;
    }

    const metrics = ["heartRateValue", "movementValue", "hrvValue", "respirationValue", "sleepStage", "temperatureValue", "humidityValue", "pressureValue", "precipitationValue"];
    const metricLabels = ["Heart Rate", "Movement", "HRV", "Respiration", "Sleep Stage", "Temperature", "Humidity", "Pressure", "Precipitation"];

    // table
    const correlationMatrix = [];
    for (let i = 0; i < metrics.length; i++) {
        const row = [];
        for (let j = 0; j < metrics.length; j++) {
            if (i === j) {
                row.push(1.0); // diagonal
            } else {
                const corr = calculateCorrelation(metrics[i], metrics[j]);
                row.push(isNaN(corr) ? 0 : corr);
            }
        }
        correlationMatrix.push(row);
    }

    // chart
    const strongCorrelations = [];
    for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) { // avoid dupes
            const corr = correlationMatrix[i][j];
            if (Math.abs(corr) > 0.2) { // filter
                strongCorrelations.push({
                    label: `${metricLabels[i]} ↔ ${metricLabels[j]}`,
                    value: corr
                });
            }
        }
    }

    // sort
    strongCorrelations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const ctx = document.getElementById("correlationChart").getContext("2d");

    // again idk if I need this but it works so ill leave it
    if (window.correlationChart instanceof Chart) {
        window.correlationChart.destroy();
    }

    window.correlationChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: strongCorrelations.map(item => item.label),
            datasets: [{
                label: "Correlation",
                data: strongCorrelations.map(item => item.value),
                backgroundColor: strongCorrelations.map(item =>
                    item.value > 0 ? "rgba(40, 167, 69, 0.8)" : "rgba(220, 53, 69, 0.8)"
                ),
                borderColor: strongCorrelations.map(item =>
                    item.value > 0 ? "rgb(40, 167, 69)" : "rgb(220, 53, 69)"
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: {
                x: {
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: "Correlation Coefficient"
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: "Sleep Metrics Correlations (|r| > 0.2)"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Correlation: ${context.parsed.x.toFixed(3)}`;
                        }
                    }
                }
            }
        }
    });
}

function calculateCorrelation(metric1, metric2) {
    const data1 = currentData.map(d => d[metric1]).filter(v => v != null && !isNaN(v));
    const data2 = currentData.map(d => d[metric2]).filter(v => v != null && !isNaN(v));

    if (data1.length === 0 || data2.length === 0 || data1.length !== data2.length) {
        return NaN;
    }

    const n = data1.length;
    const sum1 = data1.reduce((a, b) => a + b, 0);
    const sum2 = data2.reduce((a, b) => a + b, 0);
    const sum1Sq = data1.reduce((a, b) => a + b * b, 0);
    const sum2Sq = data2.reduce((a, b) => a + b * b, 0);
    const pSum = data1.reduce((sum, val, i) => sum + val * data2[i], 0);
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

    if (den === 0) return 0;

    return num / den;
}

function switchView(view) {
    currentView = view;

    document.getElementById("dailyView").classList.toggle("active", view === "daily");
    document.getElementById("weeklyView").classList.toggle("active", view === "weekly");
    document.getElementById("dailyContent").style.display = view === "daily" ? "block" : "none";
    document.getElementById("weeklyContent").style.display = view === "weekly" ? "block" : "none";

    if (view === "weekly") {
        updateWeekNavigation();
        loadWeeklyData();
    }
}

function generateWeeks() {
    if (availableDates.length === 0) return;

    availableWeeks = [];
    const sortedDates = [...availableDates].sort(); // reorder

    let weekStart = null;
    let currentWeekDates = [];

    sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0 = sunday

        // start new week
        if (weekStart === null || dayOfWeek === 1) {
            if (currentWeekDates.length > 0) {
                availableWeeks.push({
                    dates: [...currentWeekDates],
                    startDate: currentWeekDates[0],
                    endDate: currentWeekDates[currentWeekDates.length - 1]
                });
            }
            weekStart = dateStr;
            currentWeekDates = [dateStr];
        } else {
            currentWeekDates.push(dateStr);
        }
    });

    // add the last week
    if (currentWeekDates.length > 0) {
        availableWeeks.push({
            dates: [...currentWeekDates],
            startDate: currentWeekDates[0],
            endDate: currentWeekDates[currentWeekDates.length - 1]
        });
    }

    // newest first
    availableWeeks.reverse();
    currentWeekIndex = 0;
}

function updateWeekNavigation() {
    if (availableWeeks.length === 0) return;

    const currentWeek = availableWeeks[currentWeekIndex];
    document.getElementById("currentWeek").textContent = 
        `${currentWeek.startDate} to ${currentWeek.endDate}`;

    document.getElementById("prevWeek").disabled = currentWeekIndex >= availableWeeks.length - 1;
    document.getElementById("nextWeek").disabled = currentWeekIndex <= 0;
}

function navigateWeek(direction) {
    if (availableWeeks.length === 0) return;

    const newIndex = currentWeekIndex + direction;

    if (newIndex >= 0 && newIndex < availableWeeks.length) {
        currentWeekIndex = newIndex;
        updateWeekNavigation();
        loadWeeklyData();
    }
}

async function loadWeeklyData() {
    if (availableWeeks.length === 0) return;

    const currentWeek = availableWeeks[currentWeekIndex];
    console.log("Loading weekly data for:", currentWeek);

    document.getElementById("loadingMessage").style.display = "block";

    try {
        const response = await fetch(`${FIREBASE_URL}.json`);
        const allData = await response.json();

        if (!allData) return;

        let weekData = [];

        currentWeek.dates.forEach(dateStr => {
            const dayData = Object.entries(allData).filter(([timestamp, values]) => {
                const date = new Date(parseInt(timestamp));
                return date.toISOString().split("T")[0] === dateStr;
            });

            const dayFormattedData = dayData.map(([timestamp, values]) => ({
                time: new Date(parseInt(timestamp)),
                date: dateStr,
                ...values
            }));

            weekData = weekData.concat(dayFormattedData);
        });

        weekData.sort((a, b) => a.time - b.time);
        weeklyData = weekData;

        document.getElementById("loadingMessage").style.display = "none";

        updateWeeklyStats();
        updateWeeklyTrendsChart();
        updateWeeklyCorrelationChart();

    } catch (error) {
        console.error("Error loading weekly data:", error);
        document.getElementById("loadingMessage").style.display = "none";
    }
}

function updateWeeklyStats() {
    if (!weeklyData || weeklyData.length === 0) return;

    const currentWeek = availableWeeks[currentWeekIndex];
    const totalDays = currentWeek.dates.length;

    const avgHeartRate = calculateWeeklyAverage("heartRateValue");
    const avgHRV = calculateWeeklyAverage("hrvValue");
    const avgTemp = calculateWeeklyAverage("temperatureValue");
    const avgMovement = calculateWeeklyAverage("movementValue");
    const avgRespiration = calculateWeeklyAverage("respirationValue");
    const avgHumidity = calculateWeeklyAverage("humidityValue");
    const avgPressure = calculateWeeklyAverage("pressureValue");
    const totalPrecipitation = weeklyData.reduce((sum, d) => sum + (d.precipitationValue || 0), 0).toFixed(1);
    const totalSleepMinutes = weeklyData.length;
    const totalSleepHours = (totalSleepMinutes / 60).toFixed(1);

    const statsHTML = `
        <div class="stat-card">
            <h3>Total Sleep (Week)</h3>
            <p>${totalSleepHours} hours</p>
        </div>
        <div class="stat-card">
            <h3>Days Tracked</h3>
            <p>${totalDays} days</p>
        </div>
        <div class="stat-card">
            <h3>Avg Heart Rate</h3>
            <p>${avgHeartRate} bpm</p>
        </div>
        <div class="stat-card">
            <h3>Avg HRV</h3>
            <p>${avgHRV}</p>
        </div>
        <div class="stat-card">
            <h3>Avg Temperature</h3>
            <p>${avgTemp}°C</p>
        </div>
        <div class="stat-card">
            <h3>Avg Movement</h3>
            <p>${avgMovement}</p>
        </div>
        <div class="stat-card">
            <h3>Avg Respiration</h3>
            <p>${avgRespiration} bpm</p>
        </div>
        <div class="stat-card">
            <h3>Avg Humidity</h3>
            <p>${avgHumidity}%</p>
        </div>
        <div class="stat-card">
            <h3>Weekly Precipitation</h3>
            <p>${totalPrecipitation} mm</p>
        </div>
    `;

    document.getElementById("weeklyStatsGrid").innerHTML = statsHTML;
}

function calculateWeeklyAverage(field) {
    if (!weeklyData || weeklyData.length === 0) return "N/A";

    const values = weeklyData.filter(d => d[field] != null && !isNaN(d[field])).map(d => d[field]);
    if (values.length === 0) return "N/A";

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    return avg.toFixed(1);
}

function updateWeeklyTrendsChart() {
    if (!weeklyData || weeklyData.length === 0) return;

    const ctx = document.getElementById("weeklyTrendsChart").getContext("2d");

    if (window.weeklyTrendsChart instanceof Chart) {
        window.weeklyTrendsChart.destroy();
    }

    const dailyStats = {};

    weeklyData.forEach(point => {
        if (!dailyStats[point.date]) {
            dailyStats[point.date] = {
                heartRateValue: [],
                movementValue: [],
                hrvValue: [],
                respirationValue: [],
                temperatureValue: [],
                humidityValue: [],
                precipitationValue: [],
                totalDataPoints: 0
            };
        }

        if (point.heartRateValue != null && !isNaN(point.heartRateValue)) {
            dailyStats[point.date].heartRateValue.push(point.heartRateValue);
        }
        if (point.movementValue != null && !isNaN(point.movementValue)) {
            dailyStats[point.date].movementValue.push(point.movementValue);
        }
        if (point.hrvValue != null && !isNaN(point.hrvValue)) {
            dailyStats[point.date].hrvValue.push(point.hrvValue);
        }
        if (point.respirationValue != null && !isNaN(point.respirationValue)) {
            dailyStats[point.date].respirationValue.push(point.respirationValue);
        }
        if (point.temperatureValue != null && !isNaN(point.temperatureValue)) {
            dailyStats[point.date].temperatureValue.push(point.temperatureValue);
        }
        if (point.humidityValue != null && !isNaN(point.humidityValue)) {
            dailyStats[point.date].humidityValue.push(point.humidityValue);
        }
        if (point.precipitationValue != null && !isNaN(point.precipitationValue)) {
            dailyStats[point.date].precipitationValue.push(point.precipitationValue);
        }

        dailyStats[point.date].totalDataPoints++;
    });


    const dates = Object.keys(dailyStats).sort();

    const datasets = [
        {
            label: "Total Sleep (hours)",
            data: dates.map(date => (dailyStats[date].totalDataPoints / 60).toFixed(1)),
            borderColor: "rgb(102, 16, 242)",
            backgroundColor: "rgba(102, 16, 242, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            yAxisID: "y1"
        },
        {
            label: "Avg Heart Rate (bpm)",
            data: dates.map(date => {
                const values = dailyStats[date].heartRateValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(1) : null;
            }),
            borderColor: "rgb(220, 53, 69)",
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            yAxisID: "y2"
        },
        {
            label: "Avg HRV",
            data: dates.map(date => {
                const values = dailyStats[date].hrvValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(1) : null;
            }),
            borderColor: "rgb(40, 167, 69)",
            backgroundColor: "rgba(40, 167, 69, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            yAxisID: "y3"
        },
        {
            label: "Avg Temperature (°C)",
            data: dates.map(date => {
                const values = dailyStats[date].temperatureValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(1) : null;
            }),
            borderColor: "rgb(108, 117, 125)",
            backgroundColor: "rgba(108, 117, 125, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            borderDash: [5, 5],
            yAxisID: "y4"
        },
        {
            label: "Avg Respiration (bpm)",
            data: dates.map(date => {
                const values = dailyStats[date].respirationValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(1) : null;
            }),
            borderColor: "rgb(0, 123, 255)",
            backgroundColor: "rgba(0, 123, 255, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            yAxisID: "y5"
        },
        {
            label: "Avg Movement",
            data: dates.map(date => {
                const values = dailyStats[date].movementValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(2) : null;
            }),
            borderColor: "rgb(255, 193, 7)",
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            yAxisID: "y6"
        },
        {
            label: "Avg Humidity (%)",
            data: dates.map(date => {
                const values = dailyStats[date].humidityValue;
                return values.length > 0 ? (values.reduce((a, b) => a + b) / values.length).toFixed(1) : null;
            }),
            borderColor: "rgb(23, 162, 184)",
            backgroundColor: "rgba(23, 162, 184, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            borderDash: [3, 3],
            yAxisID: "y7"
        },
        {
            label: "Total Precipitation (mm)",
            data: dates.map(date => {
                const values = dailyStats[date].precipitationValue;
                return values.length > 0 ? values.reduce((a, b) => a + b).toFixed(1) : 0;
            }),
            borderColor: "rgb(32, 201, 151)",
            backgroundColor: "rgba(32, 201, 151, 0.1)",
            tension: 0.2,
            pointRadius: 6,
            borderDash: [10, 2],
            yAxisID: "y8"
        }
    ];

    window.weeklyTrendsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Date"
                    }
                },
                y1: { type: "linear", position: "left", display: false },
                y2: { type: "linear", position: "left", display: false },
                y3: { type: "linear", position: "right", display: false },
                y4: { type: "linear", position: "right", display: false },
                y5: { type: "linear", position: "right", display: false },
                y6: { type: "linear", position: "right", display: false },
                y7: { type: "linear", position: "right", display: false },
                y8: { type: "linear", position: "right", display: false }
            },
            plugins: {
                legend: {
                    position: "top",
                },
                title: {
                    display: true,
                    text: "Weekly Sleep & Environmental Trends"
                }
            }
        }
    });
}

function updateWeeklyCorrelationChart() {
    if (!weeklyData || weeklyData.length === 0) return;

    const dailyStats = {};

    weeklyData.forEach(point => {
        if (!dailyStats[point.date]) {
            dailyStats[point.date] = {
                heartRateValue: [],
                movementValue: [],
                hrvValue: [],
                respirationValue: [],
                temperatureValue: [],
                humidityValue: [],
                precipitationValue: [],
                totalDataPoints: 0
            };
        }

        if (point.heartRateValue != null && !isNaN(point.heartRateValue)) {
            dailyStats[point.date].heartRateValue.push(point.heartRateValue);
        }
        if (point.movementValue != null && !isNaN(point.movementValue)) {
            dailyStats[point.date].movementValue.push(point.movementValue);
        }
        if (point.hrvValue != null && !isNaN(point.hrvValue)) {
            dailyStats[point.date].hrvValue.push(point.hrvValue);
        }
        if (point.respirationValue != null && !isNaN(point.respirationValue)) {
            dailyStats[point.date].respirationValue.push(point.respirationValue);
        }
        if (point.temperatureValue != null && !isNaN(point.temperatureValue)) {
            dailyStats[point.date].temperatureValue.push(point.temperatureValue);
        }
        if (point.humidityValue != null && !isNaN(point.humidityValue)) {
            dailyStats[point.date].humidityValue.push(point.humidityValue);
        }
        if (point.precipitationValue != null && !isNaN(point.precipitationValue)) {
            dailyStats[point.date].precipitationValue.push(point.precipitationValue);
        }

        dailyStats[point.date].totalDataPoints++;
    });

    const dates = Object.keys(dailyStats).sort();
    const dailyValues = {
        totalSleep: [],
        avgHeartRate: [],
        avgHRV: [],
        avgTemperature: [],
        avgRespiration: [],
        avgMovement: [],
        avgHumidity: [],
        totalPrecipitation: []
    };

    dates.forEach(date => {

        dailyValues.totalSleep.push(dailyStats[date].totalDataPoints / 60);

        const hrValues = dailyStats[date].heartRateValue;
        dailyValues.avgHeartRate.push(hrValues.length > 0 ? hrValues.reduce((a, b) => a + b) / hrValues.length : null);

        const hrvValues = dailyStats[date].hrvValue;
        dailyValues.avgHRV.push(hrvValues.length > 0 ? hrvValues.reduce((a, b) => a + b) / hrvValues.length : null);

        const tempValues = dailyStats[date].temperatureValue;
        dailyValues.avgTemperature.push(tempValues.length > 0 ? tempValues.reduce((a, b) => a + b) / tempValues.length : null);

        const respValues = dailyStats[date].respirationValue;
        dailyValues.avgRespiration.push(respValues.length > 0 ? respValues.reduce((a, b) => a + b) / respValues.length : null);

        const moveValues = dailyStats[date].movementValue;
        dailyValues.avgMovement.push(moveValues.length > 0 ? moveValues.reduce((a, b) => a + b) / moveValues.length : null);

        const humidValues = dailyStats[date].humidityValue;
        dailyValues.avgHumidity.push(humidValues.length > 0 ? humidValues.reduce((a, b) => a + b) / humidValues.length : null);

        const precipValues = dailyStats[date].precipitationValue;
        dailyValues.totalPrecipitation.push(precipValues.length > 0 ? precipValues.reduce((a, b) => a + b) : 0);
    });

    const metrics = ["totalSleep", "avgHeartRate", "avgHRV", "avgTemperature", "avgRespiration", "avgMovement", "avgHumidity", "totalPrecipitation"];
    const metricLabels = ["Total Sleep", "Avg Heart Rate", "Avg HRV", "Avg Temperature", "Avg Respiration", "Avg Movement", "Avg Humidity", "Total Precipitation"];

    const correlationMatrix = [];
    for (let i = 0; i < metrics.length; i++) {
        const row = [];
        for (let j = 0; j < metrics.length; j++) {
            if (i === j) {
                row.push(1.0);
            } else {
                const corr = calculateDailyCorrelation(dailyValues[metrics[i]], dailyValues[metrics[j]]);
                row.push(isNaN(corr) ? 0 : corr);
            }
        }
        correlationMatrix.push(row);
    }

    const strongCorrelations = [];
    for (let i = 0; i < metrics.length; i++) {
        for (let j = i + 1; j < metrics.length; j++) {
            const corr = correlationMatrix[i][j];
            if (Math.abs(corr) > 0.2) {
                strongCorrelations.push({
                    label: `${metricLabels[i]} ↔ ${metricLabels[j]}`,
                    value: corr
                });
            }
        }
    }

    strongCorrelations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    const ctx = document.getElementById("weeklyCorrelationChart").getContext("2d");

    if (window.weeklyCorrelationChart instanceof Chart) {
        window.weeklyCorrelationChart.destroy();
    }

    window.weeklyCorrelationChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: strongCorrelations.map(item => item.label),
            datasets: [{
                label: "Correlation",
                data: strongCorrelations.map(item => item.value),
                backgroundColor: strongCorrelations.map(item => 
                    item.value > 0 ? "rgba(40, 167, 69, 0.8)" : "rgba(220, 53, 69, 0.8)"
                ),
                borderColor: strongCorrelations.map(item => 
                    item.value > 0 ? "rgb(40, 167, 69)" : "rgb(220, 53, 69)"
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            scales: {
                x: {
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: "Daily Correlation Coefficient"
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: "Weekly Daily Trends Correlations (|r| > 0.2)"
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Daily Correlation: ${context.parsed.x.toFixed(3)}`;
                        }
                    }
                }
            }
        }
    });
}

function calculateDailyCorrelation(data1, data2) {

    const paired = [];
    for (let i = 0; i < Math.min(data1.length, data2.length); i++) {
        if (data1[i] != null && data2[i] != null && !isNaN(data1[i]) && !isNaN(data2[i])) {
            paired.push([data1[i], data2[i]]);
        }
    }

    if (paired.length < 2) return NaN;

    const x = paired.map(p => p[0]);
    const y = paired.map(p => p[1]);

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXSq = x.reduce((a, b) => a + b * b, 0);
    const sumYSq = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);

    const num = sumXY - (sumX * sumY / n);
    const den = Math.sqrt((sumXSq - sumX * sumX / n) * (sumYSq - sumY * sumY / n));

    if (den === 0) return 0;

    return num / den;

}