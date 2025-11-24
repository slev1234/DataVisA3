const width = 960;
const height = 600;

const svg = d3
  .select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const pwstateToFips = {
  "01": "01",
  "02": "02",
  "04": "04",
  "05": "05",
  "06": "06",
  "08": "08",
  "09": "09",
  10: "10",
  11: "11",
  12: "12",
  13: "13",
  15: "15",
  16: "16",
  17: "17",
  18: "18",
  19: "19",
  20: "20",
  21: "21",
  22: "22",
  23: "23",
  24: "24",
  25: "25",
  26: "26",
  27: "27",
  28: "28",
  29: "29",
  30: "30",
  31: "31",
  32: "32",
  33: "33",
  34: "34",
  35: "35",
  36: "36",
  37: "37",
  38: "38",
  39: "39",
  40: "40",
  41: "41",
  42: "42",
  44: "44",
  45: "45",
  46: "46",
  47: "47",
  48: "48",
  49: "49",
  50: "50",
  51: "51",
  53: "53",
  54: "54",
  55: "55",
  56: "56",
  72: "72",
};

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


Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  d3.csv("data/usa_00003.csv"),
]).then(([us, data]) => {
  console.log("CSV rows:", data.length);

  // Clean data
  data = data.filter((d) => d.DEGFIELD !== "0");
  data = data.filter((d) => d.EMPSTAT === "1");
  data = data.filter((d) => d.PWSTATE2 !== "0");
  data.forEach((d) => (d.PERWT = +d.PERWT));

  console.log("After filtering:", data.length);

  // Build map with proper projection
  const states = topojson.feature(us, us.objects.states);

  // ADD PROJECTION - this is what you're missing!
  const projection = d3.geoAlbersUsa().fitSize([width, height], states);

  const path = d3.geoPath().projection(projection);

  // Aggregate by state
  const byState = d3.rollups(
    data,
    (v) => d3.sum(v, (d) => d.PERWT),
    (d) => d.PWSTATE2.padStart(2, "0")
  );

  const stateMap = new Map(byState);
  const max = d3.max(byState, (d) => d[1]);

  const color = d3
    .scaleSequential()
    .domain([0, max])
    .interpolator(d3.interpolateBlues);

  // Draw states with colors
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
      tooltip.style("visibility", "visible").html(`
          <strong>${stateName}</strong><br/>
          College Graduates: ${val.toLocaleString()}
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", function () {
      // Remove highlight
      d3.select(this).attr("stroke", "#333").attr("stroke-width", 0.5);

      // Hide tooltip
      tooltip.style("visibility", "hidden");
    });
});
