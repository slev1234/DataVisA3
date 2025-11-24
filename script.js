const width = 960;
const height = 600;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("background-color", "white")
  .style("border", "1px solid #ddd")
  .style("border-radius", "4px")
  .style("padding", "10px")
  .style("font-size", "14px")
  .style("pointer-events", "none")
  .style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
  .style("z-index", "1000");

// State name mapping (FIPS to name)
const stateNames = {
  "01": "Alabama",
  "02": "Alaska",
  "04": "Arizona",
  "05": "Arkansas",
  "06": "California",
  "08": "Colorado",
  "09": "Connecticut",
  10: "Delaware",
  11: "District of Columbia",
  12: "Florida",
  13: "Georgia",
  15: "Hawaii",
  16: "Idaho",
  17: "Illinois",
  18: "Indiana",
  19: "Iowa",
  20: "Kansas",
  21: "Kentucky",
  22: "Louisiana",
  23: "Maine",
  24: "Maryland",
  25: "Massachusetts",
  26: "Michigan",
  27: "Minnesota",
  28: "Mississippi",
  29: "Missouri",
  30: "Montana",
  31: "Nebraska",
  32: "Nevada",
  33: "New Hampshire",
  34: "New Jersey",
  35: "New Mexico",
  36: "New York",
  37: "North Carolina",
  38: "North Dakota",
  39: "Ohio",
  40: "Oklahoma",
  41: "Oregon",
  42: "Pennsylvania",
  44: "Rhode Island",
  45: "South Carolina",
  46: "South Dakota",
  47: "Tennessee",
  48: "Texas",
  49: "Utah",
  50: "Vermont",
  51: "Virginia",
  53: "Washington",
  54: "West Virginia",
  55: "Wisconsin",
  56: "Wyoming",
  72: "Puerto Rico",
};

// Major field mapping (IPUMS DEGFIELD codes)
const majorNames = {
  11: "Agriculture",
  13: "Environment and Natural Resources",
  14: "Architecture",
  15: "Area, Ethnic, and Civilization Studies",
  19: "Communications",
  20: "Communication Technologies",
  21: "Computer and Information Sciences",
  22: "Cosmetology Services and Culinary Arts",
  23: "Education Administration and Teaching",
  24: "Engineering",
  25: "Engineering Technologies",
  26: "Linguistics and Foreign Languages",
  29: "Family and Consumer Sciences",
  32: "Law",
  33: "English Language, Literature, and Composition",
  34: "Liberal Arts and Humanities",
  35: "Library Science",
  36: "Biology and Life Sciences",
  37: "Mathematics and Statistics",
  38: "Military Technologies",
  40: "Interdisciplinary and Multi-Disciplinary Studies (General)",
  41: "Physical Fitness, Parks, Recreation, and Leisure",
  48: "Philosophy and Religious Studies",
  49: "Theology and Religious Vocations",
  50: "Physical Sciences",
  51: "Nuclear, Industrial Radiology, and Biological Technologies",
  52: "Psychology",
  53: "Criminal Justice and Fire Protection",
  54: "Public Affairs, Policy, and Social Work",
  55: "Social Sciences",
  56: "Construction Services",
  57: "Electrical and Mechanic Repairs and Technologies",
  58: "Precision Production and Industrial Arts",
  59: "Transportation Sciences and Technologies",
  60: "Fine Arts",
  61: "Medical and Health Sciences and Services",
  62: "Business",
  64: "History",
};

let allData;
let usTopoJSON;
let projection;
let path;
let currentSelectedMajor = "all";
let currentSelectedOccupation = "all";

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  d3.csv("data/usa_00003.csv"),
]).then(([us, data]) => {
  console.log("CSV rows:", data.length);

  usTopoJSON = us;

  // Clean data
  data = data.filter((d) => d.DEGFIELD !== "0");
  data = data.filter((d) => d.EMPSTAT === "1");
  data = data.filter((d) => d.PWSTATE2 !== "0");
  data.forEach((d) => {
    d.PERWT = +d.PERWT;
    d.INCWAGE = +d.INCWAGE;
    d.UHRSWORK = +d.UHRSWORK;
    d.DEGFIELD = d.DEGFIELD.padStart(2, "0");
  });

  allData = data;
  console.log("After filtering:", data.length);

  // Set up projection
  const states = topojson.feature(us, us.objects.states);
  projection = d3.geoAlbersUsa().fitSize([width, height], states);
  path = d3.geoPath().projection(projection);

  // Populate dropdowns
  populateMajorDropdown();
  populateOccupationDropdown();

  // Draw initial map (all majors, all occupations)
  updateMap("all", "all");
});

function populateMajorDropdown() {
  const dropdown = d3.select("#major-select");

  // Add "All Majors" option
  dropdown.append("option").attr("value", "all").text("All Majors");

  // Get unique majors from data and sort
  const uniqueMajors = [...new Set(allData.map((d) => d.DEGFIELD))].sort();

  // Add each major to dropdown
  uniqueMajors.forEach((code) => {
    const name = majorNames[code] || `Major ${code}`;
    dropdown.append("option").attr("value", code).text(name);
  });

  // Add event listener for dropdown changes
  dropdown.on("change", function () {
    currentSelectedMajor = this.value;
    updateMap(currentSelectedMajor, currentSelectedOccupation);
    // Clear the detail panels when major changes
    d3.select("#salary-chart").html("");
    d3.select("#bottom-chart").html("");
  });
}
function populateOccupationDropdown() {
  const dropdown = d3.select("#occupation-select");

  // Add "All Occupations" option
  dropdown.append("option").attr("value", "all").text("All Occupations");

  // Get unique occupations from data and sort
  const uniqueOccupations = [...new Set(allData.map((d) => d.OCC))]
    .filter((occ) => occ && occ !== "BBBB")
    .sort();

  // Add each occupation to dropdown
  uniqueOccupations.forEach((code) => {
    const name = occupationNames[code] || `Occupation ${code}`;
    dropdown.append("option").attr("value", code).text(name);
  });

  // Add event listener for dropdown changes
  d3.select("#occupation-select").on("change", function () {
  currentSelectedOccupation = this.value;
  if (
    compareMode &&
    currentSelectedOccupation2 &&
    currentSelectedOccupation !== "all" &&
    currentSelectedOccupation2 !== "all"
  ) {
    updateCompareCharts(currentSelectedMajor, currentSelectedOccupation, currentSelectedOccupation2);
  } else {
    updateMap(currentSelectedMajor, currentSelectedOccupation);
    d3.select("#salary-chart").html("");
    d3.select("#bottom-chart").html("");
  }
});
}
function populateOccupationDropdown2() {
  const dropdown2 = d3.select("#occupation-select-2");

  dropdown2.html("");

  // Add "All Occupations" option
  dropdown2.append("option").attr("value", "all").text("Select Occupations");

  // Get unique occupations from data and sort
  const uniqueOccupations = [...new Set(allData.map((d) => d.OCC))]
    .filter((occ) => occ && occ !== "BBBB")
    .sort(); 

  // Actually add the options!
  uniqueOccupations.forEach((code) => {
    const name = occupationNames[code] || `Occupation ${code}`;
    dropdown2.append("option").attr("value", code).text(name);
  });
}

let compareMode = false;
let currentSelectedOccupation2 = null;

d3.select("#compare-toggle").on("click", function () {
  compareMode = !compareMode;
  d3.select("#occupation-select-2").style("display", compareMode ? "inline" : "none");
  d3.select("#occ2-label").style("display", compareMode ? "inline" : "none");
  if (compareMode) {
    populateOccupationDropdown2();
  }
  // Clear charts, as mode changes
  d3.select("#salary-chart").html("");
  d3.select("#bottom-chart").html("");
});

// Listener for second occupation dropdown
d3.select("#occupation-select-2").on("change", function () {
  currentSelectedOccupation2 = this.value;
  if (
    compareMode &&
    currentSelectedOccupation &&
    currentSelectedOccupation !== "all" &&
    currentSelectedOccupation2 !== "all"
  ) {
    updateCompareCharts(currentSelectedMajor, currentSelectedOccupation, currentSelectedOccupation2);
  } else {
    d3.select("#salary-chart").html("");
    d3.select("#bottom-chart").html("");
  }
});


function updateMap(selectedMajor, selectedOccupation) {
  // Filter data by selected major and occupation
  let filteredData = allData;

  if (selectedMajor !== "all") {
    filteredData = filteredData.filter((d) => d.DEGFIELD === selectedMajor);
  }

  if (selectedOccupation !== "all") {
    filteredData = filteredData.filter((d) => d.OCC === selectedOccupation);
  }

  console.log("Filtered data length:", filteredData.length);

  // Aggregate by state
  const byState = d3.rollups(
    filteredData,
    (v) => d3.sum(v, (d) => d.PERWT),
    (d) => d.PWSTATE2.padStart(2, "0")
  );

  const stateMap = new Map(byState);
  const max = d3.max(byState, (d) => d[1]) || 1;

  const color = d3
    .scaleSequential()
    .domain([0, max])
    .interpolator(d3.interpolateBlues);

  // Get states features
  const states = topojson.feature(usTopoJSON, usTopoJSON.objects.states);

  // Remove old paths
  svg.selectAll("path").remove();

  // Draw updated states
  svg
    .selectAll("path")
    .data(states.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .attr("fill", (d) => {
      const fips = d.id.toString().padStart(2, "0");
      const val = stateMap.get(fips) || 0;
      return val > 0 ? color(val) : "#eee";
    })
    .style("cursor", "pointer")
    .on("mouseover", function (event, d) {
      const fips = d.id.toString().padStart(2, "0");
      const val = stateMap.get(fips) || 0;
      const stateName = stateNames[fips] || "Unknown";

      // Highlight the state
      d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);

      // Show tooltip
      const majorText =
        selectedMajor === "all"
          ? "All Majors"
          : majorNames[selectedMajor] || `Major ${selectedMajor}`;

      const occupationText =
        selectedOccupation === "all"
          ? "All Occupations"
          : occupationNames[selectedOccupation] ||
            `Occupation ${selectedOccupation}`;

      tooltip.style("visibility", "visible").html(`
          <strong>${stateName}</strong><br/>
          ${majorText}<br/>
          ${occupationText}<br/>
          College Graduates: ${val.toLocaleString()}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", function () {
      // Remove highlight (unless it's the clicked state)
      const isClicked = d3.select(this).classed("clicked");
      if (!isClicked) {
        d3.select(this).attr("stroke", "#333").attr("stroke-width", 0.5);
      }

      // Hide tooltip
      tooltip.style("visibility", "hidden");
    })
    .on("click", function (event, d) {
      const fips = d.id.toString().padStart(2, "0");
      const stateName = stateNames[fips] || "Unknown";
      currentSelectedState = fips; // store clicked state

      // Add this logic:
      if (
        compareMode &&
        currentSelectedOccupation &&
        currentSelectedOccupation2 &&
        currentSelectedOccupation !== "all" &&
        currentSelectedOccupation2 !== "all"
      ) {
       updateCompareCharts(currentSelectedMajor, currentSelectedOccupation, currentSelectedOccupation2);
      } else {
        updateDetailPanels(fips, stateName, currentSelectedMajor, currentSelectedOccupation);
      }

      // Remove previous click styling
      svg.selectAll("path").classed("clicked", false);
      svg.selectAll("path").attr("stroke", "#333").attr("stroke-width", 0.5);

      // Add click styling to this state
      d3.select(this)
        .classed("clicked", true)
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 3);
    });
}

function updateDetailPanels(
  stateFips,
  stateName,
  selectedMajor,
  selectedOccupation
) {
  // Filter data for the selected state, major, and occupation
  let stateData = allData.filter(
    (d) => d.PWSTATE2.padStart(2, "0") === stateFips
  );

  if (selectedMajor !== "all") {
    stateData = stateData.filter((d) => d.DEGFIELD === selectedMajor);
  }

  if (selectedOccupation !== "all") {
    stateData = stateData.filter((d) => d.OCC === selectedOccupation);
  }

  console.log(`State data for ${stateName}:`, stateData.length);

  const majorText =
    selectedMajor === "all"
      ? "All Majors"
      : majorNames[selectedMajor] || `Major ${selectedMajor}`;

  const occupationText =
    selectedOccupation === "all"
      ? "All Occupations"
      : occupationNames[selectedOccupation] ||
        `Occupation ${selectedOccupation}`;

  // Update salary chart
  updateSalaryChart(stateData, stateName, majorText, occupationText);

  // Update bottom chart based on whether occupation is selected
  if (selectedOccupation === "all") {
    // Show occupation bar chart when no specific occupation is selected
    updateOccupationChart(stateData, stateName, majorText);
  } else {
    // Show hours worked chart when a specific occupation is selected
    updateHoursChart(stateData, stateName, majorText, occupationText);
  }
}

function updateSalaryChart(data, stateName, majorText, occupationText) {
  const container = d3.select("#salary-chart");
  container.html(""); // Clear previous content

  // Filter out invalid wages (0 or negative, or extremely high values)
  const validWages = data
    .filter((d) => d.INCWAGE > 0 && d.INCWAGE < 999999)
    .map((d) => d.INCWAGE);

  if (validWages.length === 0) {
    container.html(
      `<h3>Salary Distribution</h3><p>No salary data available for ${occupationText} in ${majorText} in ${stateName}</p>`
    );
    return;
  }

  // Calculate median
  validWages.sort((a, b) => a - b);
  const median = d3.median(validWages);

  // Add title
  container.append("h3").text(`Salary Distribution`);
  container
    .append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .html(`${occupationText}<br/>${majorText} in ${stateName}`);

  // Create histogram
  const chartWidth = 400;
  const chartHeight = 250;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };

  const svg = container
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // Create bins
  const bins = d3
    .bin()
    .domain([0, d3.max(validWages)])
    .thresholds(20)(validWages);

  // Scales
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(validWages)])
    .range([margin.left, chartWidth - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // Add bars
  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", "steelblue");

  // Add median line
  svg
    .append("line")
    .attr("x1", x(median))
    .attr("x2", x(median))
    .attr("y1", margin.top)
    .attr("y2", chartHeight - margin.bottom)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  // Add median label
  svg
    .append("text")
    .attr("x", x(median))
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .text(`Median: $${median.toLocaleString()}`);

  // Add X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(5)
        .tickFormat((d) => `$${d / 1000}k`)
    )
    .selectAll("text")
    .style("font-size", "10px");

  // Add Y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "10px");

  // Add axis labels
  svg
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Annual Income");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(chartHeight / 2))
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Count");
}

function updateOccupationChart(data, stateName, majorText) {
  const container = d3.select("#bottom-chart");
  container.html(""); // Clear previous content

  // Aggregate by occupation
  const occupationData = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.PERWT),
    (d) => d.OCC
  );

  // Sort and take top 10
  occupationData.sort((a, b) => b[1] - a[1]);
  const top10 = occupationData.slice(0, 10);

  if (top10.length === 0) {
    container.html(
      `<h3>Top Occupations</h3><p>No occupation data available for ${majorText} in ${stateName}</p>`
    );
    return;
  }

  // Add title
  container.append("h3").text(`Top 10 Occupations`);
  container
    .append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .text(`${majorText} in ${stateName}`);

  // Create bar chart
  const chartWidth = 450;
  const chartHeight = 450;
  const margin = { top: 20, right: 20, bottom: 200, left: 60 };

  const svg = container
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // Get occupation names
  const occWithNames = top10.map((d) => ({
    code: d[0],
    name: occupationNames[d[0]] || `Occupation ${d[0]}`,
    count: d[1],
  }));

  // Scales
  const x = d3
    .scaleBand()
    .domain(occWithNames.map((d) => d.name))
    .range([margin.left, chartWidth - margin.right])
    .padding(0.2);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(occWithNames, (d) => d.count)])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // Add bars
  svg
    .selectAll("rect")
    .data(occWithNames)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.name))
    .attr("y", (d) => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.count))
    .attr("fill", "steelblue")
    .on("click", function(event, d) {
  d3.select("#occupation-select").property("value", d.code);
  currentSelectedOccupation = d.code; // actually change filter!
  updateMap(currentSelectedMajor, currentSelectedOccupation);
  updateHoursChart(data.filter(dd => dd.OCC === d.code), stateName, majorText, d.name);
})

    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill", "orange");
      tooltip
        .style("visibility", "visible")
        .html(
          `<strong>${d.name}</strong><br/>Count: ${d.count.toLocaleString()}`
        );
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill", "steelblue");
      tooltip.style("visibility", "hidden");
    })

  // Add X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", "9px")
    .each(function (d) {
      // Wrap text if too long
      const text = d3.select(this);
      const words = d.split(" ");
      if (words.length > 3) {
        text.text(words.slice(0, 3).join(" ") + "...");
      }
    });

  // Add Y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat((d) => d.toLocaleString()))
    .selectAll("text")
    .style("font-size", "10px");

  // Add axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(chartHeight / 2))
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Number of Graduates");
}
/* Box Plot Version
function updateHoursChart(data, stateName, majorText, occupationText) {
  const container = d3.select("#bottom-chart");
  container.html(""); // Clear previous content

  // Filter out invalid hours
  const validHours = data
    .filter((d) => d.UHRSWORK > 0 && d.UHRSWORK <= 99)
    .map((d) => d.UHRSWORK);

  if (validHours.length === 0) {
    container.html(
      `<h3>Weekly Hours Worked</h3><p>No hours data available for ${occupationText} in ${majorText} in ${stateName}</p>`
    );
    return;
  }

  // Sort
  validHours.sort(d3.ascending);

  // Compute statistics
  const q1 = d3.quantile(validHours, 0.25);
  const median = d3.quantile(validHours, 0.5);
  const q3 = d3.quantile(validHours, 0.75);
  const iqr = q3 - q1;
  const min = d3.min(validHours);
  const max = d3.max(validHours);
  const low = validHours.find(v => v >= q1 - 1.5 * iqr);
  const high = validHours.slice().reverse().find(v => v <= q3 + 1.5 * iqr);

  // Chart parameters
  const chartWidth = 400;
  const chartHeight = 250;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const svg = container
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const minHour = d3.min(validHours);
  const maxHour = d3.max(validHours);

  // Y scale (hours)
  const y = d3.scaleLinear()
    .domain([(minHour-10), (maxHour + 10)]) // adjust if you want a tighter domain
    .range([chartHeight - margin.bottom, margin.top]);

  const x = chartWidth / 2; // center of chart for box plot

  // Title
  svg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top - 25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Weekly Hours Worked Box Plot");

  // Subheading
  svg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#666")
    .text(`${occupationText}, ${majorText} in ${stateName}`);

  // Whiskers
  svg.append("line")
    .attr("x1", x)
    .attr("x2", x)
    .attr("y1", y(low))
    .attr("y2", y(high))
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Box
  svg.append("rect")
    .attr("x", x - 40)
    .attr("width", 80)
    .attr("y", y(q3))
    .attr("height", y(q1) - y(q3))
    .attr("fill", "#69b3a2")
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Median
  svg.append("line")
    .attr("x1", x - 40)
    .attr("x2", x + 40)
    .attr("y1", y(median))
    .attr("y2", y(median))
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  // Whisker lines (horizontal)
  svg.append("line")
    .attr("x1", x - 20)
    .attr("x2", x + 20)
    .attr("y1", y(low))
    .attr("y2", y(low))
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  svg.append("line")
    .attr("x1", x - 20)
    .attr("x2", x + 20)
    .attr("y1", y(high))
    .attr("y2", y(high))
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Y axis
  svg.append("g")
    .attr("transform", `translate(${x + 90},0)`)
    .call(d3.axisRight(y).ticks(10))
    .selectAll("text")
    .style("font-size", "10px");
}
*/
//Histogram Version
/*
function updateHoursChart(data, stateName, majorText, occupationText) {
  const container = d3.select("#bottom-chart");
  container.html(""); // Clear previous content

  // Filter out invalid hours (0 or extremely high values)
  const validHours = data
    .filter((d) => d.UHRSWORK > 0 && d.UHRSWORK <= 99)
    .map((d) => d.UHRSWORK);

  if (validHours.length === 0) {
    container.html(
      `<h3>Weekly Hours Worked</h3><p>No hours data available for ${occupationText} in ${majorText} in ${stateName}</p>`
    );
    return;
  }

  // Calculate median
  validHours.sort((a, b) => a - b);
  const median = d3.median(validHours);

  // Add title
  container.append("h3").text(`Weekly Hours Worked Distribution`);
  container
    .append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .html(`${occupationText}<br/>${majorText} in ${stateName}`);

  // Create histogram
  const chartWidth = 400;
  const chartHeight = 250;
  const margin = { top: 20, right: 20, bottom: 50, left: 60 };

  const svg = container
    .append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // Create bins
  const bins = d3
    .bin()
    .domain([0, d3.max(validHours)])
    .thresholds(20)(validHours);

  // Scales
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(validHours)])
    .range([margin.left, chartWidth - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // Add bars
  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 2))
    .attr("height", (d) => y(0) - y(d.length))
    .attr("fill", "steelblue");

  // Add median line
  svg
    .append("line")
    .attr("x1", x(median))
    .attr("x2", x(median))
    .attr("y1", margin.top)
    .attr("y2", chartHeight - margin.bottom)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  // Add median label
  svg
    .append("text")
    .attr("x", x(median))
    .attr("y", margin.top - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .text(`Median: ${median.toFixed(1)} hrs/week`);

  // Add X axis
  svg
    .append("g")
    .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(10))
    .selectAll("text")
    .style("font-size", "10px");

  // Add Y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "10px");

  // Add axis labels
  svg
    .append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Hours per Week");

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(chartHeight / 2))
    .attr("y", 15)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Count");
}
*/
//violin plot hours chart
function updateHoursChart(data, stateName, majorText, occupationText) {
  const container = d3.select("#bottom-chart");
  container.html(""); // Clear previous content

  // Filter valid hours
  const validHours = data
    .filter(d => d.UHRSWORK > 0 && d.UHRSWORK <= 99)
    .map(d => d.UHRSWORK);

  if (validHours.length === 0) {
    container.html(
      `<h3>Weekly Hours Worked</h3><p>No hours data available for ${occupationText} in ${majorText} in ${stateName}</p>`
    );
    return;
  }

  // Chart config
  const chartWidth = 400;
  const chartHeight = 250;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  // Title and subtitle
  container.append("h3").text("Weekly Hours Worked Violin Plot");
  container.append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .html(`${occupationText}, ${majorText} in ${stateName}`);

  const svg = container.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // Y scale (hours, vertical axis)
  const minHour = d3.min(validHours);
  const maxHour = d3.max(validHours);
  const pad = Math.max(5, (maxHour - minHour) * 0.2);

  const y = d3.scaleLinear()
    .domain([minHour - pad, maxHour + pad])
    .range([chartHeight - margin.bottom, margin.top]);

  // Kernel density estimation
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(function(x) {
        return [x, d3.mean(V, function(v) { return kernel(x - v); })];
      });
    };
  }
  function kernelEpanechnikov(k) {
    return function(v) {
      return Math.abs(v / k) <= 1 ? (0.75 * (1 - (v / k) ** 2)) / k : 0;
    };
  }

  // Generate y points for density estimation
  const ticks = d3.range(minHour - pad, maxHour + pad, (maxHour - minHour + 2*pad) / 50);
  const kde = kernelDensityEstimator(kernelEpanechnikov(7), ticks);
  const density = kde(validHours);

  // X scale for violin width, normalize visually for each chart (~max half-width = 80px)
  const maxDensity = d3.max(density, d => d[1]);
  const xScale = d3.scaleLinear().domain([0, maxDensity]).range([0, 80]);

  // Build area for left and right sides of violin
  const area = d3.area()
    .curve(d3.curveCatmullRom)
    .x0(d => chartWidth / 2 - xScale(d[1]))
    .x1(d => chartWidth / 2 + xScale(d[1]))
    .y(d => y(d[0]));

  // Draw violin shape
  svg.append("path")
    .datum(density)
    .attr("d", area)
    .attr("fill", "#2ca2a2")
    .attr("opacity", 0.8)
    .attr("stroke", "#222")
    .attr("stroke-width", 1);

  // Draw Y axis
  svg.append("g")
    .attr("transform", `translate(${chartWidth / 2 + 90},0)`)
    .call(d3.axisRight(y).ticks(10))
    .selectAll("text")
    .style("font-size", "10px");

  // Draw median line
  const median = d3.median(validHours);
  svg.append("line")
    .attr("x1", chartWidth / 2 - 80)
    .attr("x2", chartWidth / 2 + 80)
    .attr("y1", y(median))
    .attr("y2", y(median))
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  svg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", y(median) - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .text(`Median: ${median.toFixed(1)} hrs`);
}

function updateCompareSalaryChart(dataA, dataB, stateName, majorText, occA, occB) {
  const container = d3.select("#salary-chart");
  container.html(""); // Clear previous content

  // Build salary arrays
  const validA = dataA.filter(d => d.INCWAGE > 0 && d.INCWAGE < 999999).map(d => d.INCWAGE);
  const validB = dataB.filter(d => d.INCWAGE > 0 && d.INCWAGE < 999999).map(d => d.INCWAGE);
  if (validA.length === 0 && validB.length === 0) {
    container.html(`<h3>Salary Comparison</h3><p>No salary data for these occupations in ${majorText} in ${stateName}</p>`);
    return;
  }

  // Salary bins: combine both
  const allWages = validA.concat(validB);
  const binCount = 10;
  const binGenerator = d3.bin().domain([d3.min(allWages), d3.max(allWages)]).thresholds(binCount);
  const binsA = binGenerator(validA);
  const binsB = binGenerator(validB);

  // Chart setup
  const chartWidth = 400, chartHeight = 250;
  const margin = { top: 40, right: 20, bottom: 50, left: 60 };

  container.append("h3").text("Salary Comparison");
  container.append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .html(
      `${occupationNames[occA] || occA} vs. ${occupationNames[occB] || occB}<br/>
      ${majorText}, ${stateName}`
    );

  const svg = container.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  // X axis: salary bins
  const binLabels = binsA.map(bin => `$${Math.round(bin.x0 / 1000)}k–$${Math.round(bin.x1 / 1000)}k`);
  const x = d3.scaleBand()
    .domain(binLabels)
    .range([margin.left, chartWidth - margin.right])
    .paddingInner(0.2)
    .paddingOuter(0.1);

  // Bar width for each group
  const groupBarWidth = x.bandwidth() / 3;

  // Y axis: count
  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(binsA.concat(binsB), bin => bin.length)
    ])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "9px")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Y axis
  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Bars for Occupation A
  svg.selectAll(".barA")
    .data(binsA)
    .enter()
    .append("rect")
    .attr("class", "barA")
    .attr("x", (d, i) => x(binLabels[i]) + groupBarWidth * 0)
    .attr("y", d => y(d.length))
    .attr("width", groupBarWidth)
    .attr("height", d => y(0) - y(d.length))
    .attr("fill", "#228be6")
    .attr("opacity", 0.8);

  // Bars for Occupation B
  svg.selectAll(".barB")
    .data(binsB)
    .enter()
    .append("rect")
    .attr("class", "barB")
    .attr("x", (d, i) => x(binLabels[i]) + groupBarWidth * 1.4)
    .attr("y", d => y(d.length))
    .attr("width", groupBarWidth)
    .attr("height", d => y(0) - y(d.length))
    .attr("fill", "#fa5252")
    .attr("opacity", 0.8);

  // SVG legend (top right)
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth - margin.right - 110},${margin.top - 30})`);

  // Legend A
  legend.append("rect")
    .attr("x", -64)
    .attr("y", 0)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", "#228be6");
  legend.append("text")
    .attr("x", -40)
    .attr("y", 13)
    .style("font-size", "8px")
    .style("fill", "#222")
    .text(occupationNames[occA] || occA);

  // Legend B
  legend.append("rect")
    .attr("x", -64)
    .attr("y", 22)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", "#fa5252");
  legend.append("text")
    .attr("x", -40)
    .attr("y", 13 + 22)
    .style("font-size", "8px")
    .style("fill", "#222")
    .text(occupationNames[occB] || occB);
}

function updateCompareViolinCharts(dataA, dataB, stateName, majorText, occA, occB) {
  const container = d3.select("#bottom-chart");
  container.html(""); // Clear previous content

  // Prepare data
  const validA = dataA.filter(d => d.UHRSWORK > 0 && d.UHRSWORK <= 99).map(d => d.UHRSWORK);
  const validB = dataB.filter(d => d.UHRSWORK > 0 && d.UHRSWORK <= 99).map(d => d.UHRSWORK);

  if (validA.length === 0 && validB.length === 0) {
    container.html(`<h3>Weekly Hours Worked</h3><p>No hours data for these occupations in ${majorText} in ${stateName}</p>`);
    return;
  }

  // Shared Y axis for hours
  const minHour = d3.min([...validA, ...validB]);
  const maxHour = d3.max([...validA, ...validB]);
  const pad = Math.max(5, (maxHour - minHour) * 0.2);

  const chartWidth = 400, chartHeight = 250;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  container.append("h3").text("Weekly Hours Worked Violin Comparison");
  container.append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .html(`${occupationNames[occA] || occA} vs. ${occupationNames[occB] || occB}<br/>${majorText}, ${stateName}`);

  const svg = container.append("svg")
    .attr("width", chartWidth)
    .attr("height", chartHeight);

  const y = d3.scaleLinear()
    .domain([minHour - pad, maxHour + pad])
    .range([chartHeight - margin.bottom, margin.top]);

  // Kernel density functions
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(function(x) {
        return [x, d3.mean(V, function(v) { return kernel(x - v); })];
      });
    };
  }
  function kernelEpanechnikov(k) {
    return function(v) {
      return Math.abs(v / k) <= 1 ? (0.75 * (1 - (v / k) ** 2)) / k : 0;
    };
  }

  // X positions for each violin
  const centerA = chartWidth / 3;
  const centerB = chartWidth * 2 / 3;
  const maxViolinWidth = 60;
  const leftShift = -40; // negative moves left
  const downShift = 20;

  // KDE for each distribution
  const ticks = d3.range(minHour - pad, maxHour + pad, (maxHour - minHour + 2 * pad) / 50);
  const kdeA = kernelDensityEstimator(kernelEpanechnikov(7), ticks);
  const kdeB = kernelDensityEstimator(kernelEpanechnikov(7), ticks);
  const densityA = kdeA(validA);
  const densityB = kdeB(validB);

  const maxDensity = Math.max(
    d3.max(densityA, d => d[1]),
    d3.max(densityB, d => d[1])
  );
  const xScale = d3.scaleLinear().domain([0, maxDensity]).range([0, maxViolinWidth]);

  // Draw violins
  const area = d3.area()
    .curve(d3.curveCatmullRom)
    .x0(d => -xScale(d[1]))
    .x1(d => xScale(d[1]))
    .y(d => y(d[0]));

  // Violin A
  svg.append("g")
    .attr("transform", `translate(${centerA},0)`)
    .append("path")
    .datum(densityA)
    .attr("d", area)
    .attr("fill", "#228be6")
    .attr("opacity", 0.8)
    .attr("stroke", "#222")
    .attr("stroke-width", 1);

  // Violin B
  svg.append("g")
    .attr("transform", `translate(${centerB},0)`)
    .append("path")
    .datum(densityB)
    .attr("d", area)
    .attr("fill", "#fa5252")
    .attr("opacity", 0.8)
    .attr("stroke", "#222")
    .attr("stroke-width", 1);

  // Median lines and labels
  const medianA = d3.median(validA);
  const medianB = d3.median(validB);
  svg.append("line")
    .attr("x1", centerA - maxViolinWidth)
    .attr("x2", centerA + maxViolinWidth)
    .attr("y1", y(medianA))
    .attr("y2", y(medianA))
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  svg.append("line")
    .attr("x1", centerB - maxViolinWidth)
    .attr("x2", centerB + maxViolinWidth)
    .attr("y1", y(medianB))
    .attr("y2", y(medianB))
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4");

  svg.append("text")
    .attr("x", centerA)
    .attr("y", y(medianA) - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "blue")
    .style("font-size", "12px")
    .text(`Median: ${medianA ? medianA.toFixed(1) : "n/a"} hrs`);
  svg.append("text")
    .attr("x", centerB)
    .attr("y", y(medianB) - 5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .text(`Median: ${medianB ? medianB.toFixed(1) : "n/a"} hrs`);

  // Shared Y axis
  svg.append("g")
    .attr("transform", `translate(${chartWidth / 2 + maxViolinWidth + 15},0)`)
    .call(d3.axisRight(y).ticks(10))
    .selectAll("text")
    .style("font-size", "10px");

  // SVG legend (top right)
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${chartWidth - margin.right - 110},${margin.top - 30})`);

  // Legend A
  legend.append("rect")
    .attr("x", -64)
    .attr("y", 0)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", "#228be6");
  legend.append("text")
    .attr("x", -40)
    .attr("y", 13)
    .style("font-size", "8px")
    .style("fill", "#222")
    .text(occupationNames[occA] || occA);

  // Legend B
  legend.append("rect")
    .attr("x", -64)
    .attr("y", 22)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", "#fa5252");
  legend.append("text")
    .attr("x", -40)
    .attr("y", 13 + 22)
    .style("font-size", "8px")
    .style("fill", "#222")
    .text(occupationNames[occB] || occB);
}


function updateCompareCharts(selectedMajor, occA, occB) {
  // Filter for current state (use map click or last selected state)
  // Example: Assume `currentSelectedState` holds the state FIPS code
  let stateFips = currentSelectedState || "36"; // Default to NY or whichever state is selected
  let stateName = stateNames[stateFips] || "Unknown";

  // Filter data for both occupations
  const dataA = allData.filter(d =>
    d.PWSTATE2.padStart(2, "0") === stateFips &&
    (selectedMajor === "all" || d.DEGFIELD === selectedMajor) &&
    d.OCC === occA
  );
  const dataB = allData.filter(d =>
    d.PWSTATE2.padStart(2, "0") === stateFips &&
    (selectedMajor === "all" || d.DEGFIELD === selectedMajor) &&
    d.OCC === occB
  );

  // Call compare chart functions:
  updateCompareSalaryChart(dataA, dataB, stateName, selectedMajor, occA, occB);
  updateCompareViolinCharts(dataA, dataB, stateName, selectedMajor, occA, occB);
}


