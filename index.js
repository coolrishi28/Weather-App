const http = require("http");
const fs = require("fs");
const url = require("url");
const requests = require("requests");

const homeFile = fs.readFileSync("app.html", "utf-8");

const replaceVal = (tempVal, orgVal) => {
  let temperature = tempVal.replace("{%tempval%}", Math.round(orgVal.main.temp));
  temperature = temperature.replace("{%tempmin%}", Math.round(orgVal.main.temp_min));
  temperature = temperature.replace("{%tempmax%}", Math.round(orgVal.main.temp_max));
  temperature = temperature.replace("{%location%}", orgVal.name);
  temperature = temperature.replace("{%country%}", orgVal.sys.country);
  temperature = temperature.replace("{%tempstatus%}", orgVal.weather[0].main);
  temperature = temperature.replace("{%humidity%}", orgVal.main.humidity);
  return temperature;
};

const getForecastHTML = (data, unitSymbol) => {
  const forecastMap = {};

  data.list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!forecastMap[date]) forecastMap[date] = [];
    forecastMap[date].push(item);
  });

  const keys = Object.keys(forecastMap).slice(1, 6);

  return `
    <h2 style="text-align:center; margin: 2rem auto 1rem; font-size: 2rem; font-weight: 600;">5-Day Forecast</h2>
    <div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;">
      ${keys.map(date => {
        const day = forecastMap[date][0];
        const icon = day.weather[0].icon;
        const avgTemp = Math.round(day.main.temp);
        const label = new Date(date).toLocaleDateString("en", { weekday: "short" });
        return `
          <div style="padding:1rem;border-radius:1rem;background:#a5bbdd;text-align:center;width:120px;">
            <h4>${label}</h4>
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="icon" />
            <p>${avgTemp}°${unitSymbol}</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  const city = query.city || "Los Angeles";
  const unit = query.unit || "metric";
  const unitSymbol = unit === "metric" ? "C" : "F";

  if (parsedUrl.pathname === "/") {
    requests(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=94836812dec591b13a339fa650d5415d&units=${unit}`)
      .on("data", (chunk) => {
        const weatherObj = JSON.parse(chunk);
        const weatherHTML = replaceVal(homeFile, weatherObj);

        requests(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=94836812dec591b13a339fa650d5415d&units=${unit}`)
          .on("data", (forecastChunk) => {
            const forecastData = JSON.parse(forecastChunk);
            const forecastHTML = getForecastHTML(forecastData, unitSymbol);
            const finalHTML = weatherHTML.replace("</body>", forecastHTML + "</body>");
            res.write(finalHTML);
          })
          .on("end", () => res.end());
      })
      .on("end", (err) => {
        if (err) return res.end("<h1>Unable to fetch weather.</h1>");
      });
  } else {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<h1>404 - Page Not Found</h1>");
  }
});

server.listen(8000, "127.0.0.1", () => {
  console.log("✅ Server is listening on http://127.0.0.1:8000");
});
