class WeatherByCoordsDTO {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

class WeatherByCityDTO {
    constructor(city) {
        this.q = city;
    }
}

class WeatherServiceAPI {
    static get WEATHER_API_URL(){ return "https://api.openweathermap.org/data/2.5/forecast"}
    static get API_KEY(){         return '58e1daad96f3ccaf0f9f626eaad3bb98'}
    static get NATIVE_CITY(){     return 'Cherkasy'}

    constructor() {}

    static getWeatherByCoords(weatherDto) {
        weatherDto['appid'] = WeatherServiceAPI.API_KEY;
        weatherDto['units'] = "metric";

        let queryString = $.param(weatherDto);

        let url = `${WeatherServiceAPI.WEATHER_API_URL}?${queryString}`;

        return fetch(url , {
            method: 'GET',
            headers: {}
        }).then((res) => {
            return res.json()
        })
    }
}


class WeatherModel {
    constructor(resp) {
        this.resp = resp;
    };
    getCurrentWeather(){
        return this.resp.list[0]
    }

    getWeatherForecast(stepsCount){
        return this.resp.list.slice(0, stepsCount)
    }
    getCurrentWeatherDesc(){
        // debugger
        return this.getCurrentWeather().weather[0].description;
    }

    getCurrentWeatherTemp() {
        return this.getCurrentWeather().main.temp;
    }

    getCurrentDaySunTime() {
        let sunrise = this.resp.city.sunrise*1000;
        let sunset = this.resp.city.sunset*1000;
        let durration = this._getCurrentDayDuration(sunset, sunrise);

        return {
            sunrise: new Date(sunrise),
            sunset: new Date(sunset),
            durration: durration
        }
    }

    _getCurrentDayDuration(sunset, sunrize){
         let res = moment.utc(
                moment(new Date(sunset), "HH:mm:ss")
                 .diff(moment(new Date (sunrize),"HH:mm:ss"))
         ).format("HH:mm")
        return res
    }

};

let weather = null;

function initWeather(resp){
    weather = new WeatherModel(resp);

    let TAB_KEYS = {
        TODAY: "today",
        FORECAST: 'forecast'
    }

    let tabsConfig = [
        {
            title: "Today",
            key: TAB_KEYS.TODAY
        },
        {
            title: "5-day forecast",
            key: TAB_KEYS.FORECAST
        }
    ];

    let weatherContainer = document.createElement("div");
    document.body.appendChild(weatherContainer);


    let tabsClickHandler = (key) => {
        if (key == TAB_KEYS.TODAY) {
            new TodayView(weatherContainer).render(weather);
        } else if (key == TAB_KEYS.FORECAST){
            weatherContainer.innerHTML = "privet"
        }
    }

    let tabsContainer = document.createElement("div");
    document.body.prepend(tabsContainer);
    tabsContainer.style.display = "flex";
    new WeatherTabsBlockView(tabsContainer, tabsClickHandler).render(tabsConfig);

    tabsClickHandler(TAB_KEYS.TODAY);



}

if (!navigator.geolocation) {
    WeatherServiceAPI
        .getWeatherByCoords(
            new WeatherByCityDTO(WeatherServiceAPI.NATIVE_CITY)
        )
        .then()
} else {
    navigator.geolocation.getCurrentPosition((position)=> {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    // debugger
    WeatherServiceAPI
        .getWeatherByCoords(
            new WeatherByCoordsDTO(lat, lon)
        )
        .then(initWeather)

}, () => {
        WeatherServiceAPI
            .getWeatherByCoords(
                new WeatherByCityDTO(WeatherServiceAPI.NATIVE_CITY)
            )
            .then((res) => { alert('yra blyat')})
    });
}

class WeatherTabsBlockView {
    constructor(renderToHtmlElem,tabsClickHandler){
        this.renderToHtmlElem = renderToHtmlElem;
        this.tabsClickHandler = tabsClickHandler;
    }

    render(tabsConfig) {
        tabsConfig.forEach((tabConfig) => {
            let headerTab = document.createElement("div");
            this.renderToHtmlElem.appendChild(headerTab);
            headerTab.innerHTML = tabConfig.title;
            headerTab.style.paddingRight = "10px";
            

        })
    }
}


// Current Block

class TodayWeatherCardView {
    constructor(renderToHtmlElem) {
        this.renderToHtmlElem = renderToHtmlElem;
    }

    render(todayWeatherData){
        let header = this._renderHeader(todayWeatherData);
        this.renderToHtmlElem.appendChild(header);


        let body = document.createElement("div");
        body.style.display = "flex";
        body.style.justifyContent = "space-around";


        let iconBlock = document.createElement("div");
        iconBlock.innerHTML = todayWeatherData.getCurrentWeatherDesc();
        body.appendChild(iconBlock);

        let temperatureBlock = document.createElement("div");
        temperatureBlock.innerHTML = todayWeatherData.getCurrentWeatherTemp();
        body.appendChild(temperatureBlock);

        let detailsBlock = document.createElement("div");
        body.appendChild(detailsBlock);
        let sunsetBlock = document.createElement("div");
        sunsetBlock.innerHTML = todayWeatherData.getCurrentDaySunTime().sunset;
        detailsBlock.appendChild(sunsetBlock);

        let sunriseBlock = document.createElement("div");
        sunriseBlock.innerHTML = todayWeatherData.getCurrentDaySunTime().sunrise;
        detailsBlock.appendChild(sunriseBlock)

        let durationBlock = document.createElement("div");
        durationBlock.innerHTML = todayWeatherData.getCurrentDaySunTime().durration;
        detailsBlock.appendChild(durationBlock);

        this.renderToHtmlElem.appendChild(body);

    }

    _renderHeader(todayWeatherData) {
        let header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.marginBottom = "15px";

        let headerTitle = document.createElement("div");
        headerTitle.innerHTML = "CURRENT WEATHER"
        headerTitle.style.color = "#20a1ff";

        let headerDate = document.createElement("div");
        headerDate.innerHTML = todayWeatherData.getCurrentWeather().dt_txt;
        headerDate.style.color = "#20a1ff";
        header.appendChild(headerTitle);
        header.appendChild(headerDate);
        return header
    }
}

// Hourly Block

class WeatherEveryThreeHoursCardView {
    constructor(renderToHtmlElem){
        this.renderToHtmlElem = renderToHtmlElem;
    }

    render(forecasts) {
        let header = this._renderHeader();
        this.renderToHtmlElem.appendChild(header);

        let body = document.createElement("div");
        body.style.display = "flex";
        body.style.flexDirection = "column";



        let titles = [
            {
                title: 'Today',
                data: forecasts.map((forecast) => { return forecast.dt_txt })
            },
            {
                title: 'forecast',
                data: forecasts.map((forecast) => { return forecast.weather[0].description })
            },
            {
                title: 'Temp(℃)',
                data: forecasts.map((forecast) => { return forecast.main.temp })
            },
            {
                title: 'RealFeel',
                data: forecasts.map((forecast) => { return forecast.main.feels_like })
            },
            {
                title: 'Wind(km/h)',
                data: forecasts.map((forecast) => { return forecast.wind.speed })
            }]

        titles.forEach((config) => {
            let newRow = document.createElement('div');
            newRow.style.display = "flex";
            newRow.style.justifyContent = "space-between";
            body.appendChild(newRow)

            let title = document.createElement('div');
            title.style.width = "100px";
            title.innerHTML = config.title
            newRow.appendChild(title)

            config.data.forEach((text) => {
                let data = document.createElement('div');
                data.style.width = "140px";
                data.style.textAlign = "center";
                data.style.marginBottom = "8px";
                data.innerHTML = text
                newRow.appendChild(data)
            })
        })

        this.renderToHtmlElem.appendChild(body);
    }

    _renderHeader() {
        let header = document.createElement("div");
        header.innerHTML = "HOURLY";
        header.style.color = "#20a1ff";

        header.style.marginBottom = "15px";

        return header;
    }
}




class TodayView {
    constructor(renderToHtmlElem) {
        this.renderToHtmlElem = renderToHtmlElem;
    }
    render(todayWeatherData){
        let currentWeatherBlock = document.createElement("div");
        new TodayWeatherCardView(currentWeatherBlock).render(todayWeatherData);
        this.renderToHtmlElem.appendChild(currentWeatherBlock);

        let hourlyWeatherBlock = document.createElement("div");
        new WeatherEveryThreeHoursCardView(hourlyWeatherBlock).render(todayWeatherData.getWeatherForecast(6));
        this.renderToHtmlElem.appendChild(hourlyWeatherBlock);
    }

}


