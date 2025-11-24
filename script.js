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
  dropdown.on("change", function () {
    currentSelectedOccupation = this.value;
    updateMap(currentSelectedMajor, currentSelectedOccupation);
    // Clear the detail panels when occupation changes
    d3.select("#salary-chart").html("");
    d3.select("#bottom-chart").html("");
  });
}

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

      // Remove previous click styling
      svg.selectAll("path").classed("clicked", false);
      svg.selectAll("path").attr("stroke", "#333").attr("stroke-width", 0.5);

      // Add click styling to this state
      d3.select(this)
        .classed("clicked", true)
        .attr("stroke", "#ff6b6b")
        .attr("stroke-width", 3);

      // Update the detail panels
      updateDetailPanels(fips, stateName, selectedMajor, selectedOccupation);
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
    });

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
