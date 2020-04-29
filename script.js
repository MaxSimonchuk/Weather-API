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
            if (res.ok){
                return res.json()
            } else {
                return res.json().then((redBody) => {
                    throw redBody.message
                })
            }
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

    getForecastGroupdByDays(){
        return this.resp.list.reduce(function (acc , hourlyValue) {
            let dayOfHourlyValue = new Date (hourlyValue.dt_txt).getDate()
            let monthOfHourlyValue = new Date (hourlyValue.dt_txt).getMonth()

            let dayKey = dayOfHourlyValue < 10 ? "0" + dayOfHourlyValue : dayOfHourlyValue
            let key = "" + monthOfHourlyValue + dayKey

            acc[key] || (acc[key] = [])
            acc[key].push(hourlyValue)

            return acc
        },{})
    }

    getCityName(){
        return this.resp.city.name
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
    document.body.innerHTML = ''

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
        weatherContainer.innerHTML = ''
        if (key == TAB_KEYS.TODAY) {
            new TodayView(weatherContainer).render(weather);
        } else if (key == TAB_KEYS.FORECAST){
            new DayForecast(weatherContainer).render(weather);
        }
    }

    let tabsContainer = document.createElement("div");
    document.body.prepend(tabsContainer);
    tabsContainer.style.backgroundColor = "black";
    tabsContainer.style.display = "flex";
    tabsContainer.style.width = "100%";
    tabsContainer.style.paddingLeft = "25px";
    tabsContainer.style.boxSizing = "border-box";
    new WeatherTabsBlockView(tabsContainer, tabsClickHandler).render(tabsConfig);

    let searchContainer = document.createElement("div");
    document.body.prepend(searchContainer);
    let onCityChanged = (cityName) => {
        WeatherServiceAPI
            .getWeatherByCoords(
                new WeatherByCityDTO(cityName)
            ).then(initWeather)
            .catch((errMessage) => {
                weatherContainer.innerHTML = ''
                weatherContainer.innerHTML = errMessage
            })
    }
    new Search(searchContainer, onCityChanged).render(weather.getCityName());

    tabsClickHandler(TAB_KEYS.TODAY);
}

if (!navigator.geolocation) {
    WeatherServiceAPI
        .getWeatherByCoords(
            new WeatherByCityDTO(WeatherServiceAPI.NATIVE_CITY)
        ).then(initWeather)
} else {
    navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

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
            .then(initWeather)
    });
}

class Search {
    constructor(renderToHtmlElem, onSearchCahngeHandler){
        this.renderToHtmlElem = renderToHtmlElem;
        this.onSearchCahngeHandler = onSearchCahngeHandler;
    }

    render(city){
        let search = document.createElement("input");
        search.value = city;
        this.renderToHtmlElem.appendChild(search);
        search.addEventListener('change', (event) => {
            this.onSearchCahngeHandler(event.target.value) ;
        })
    }
}
class DayForecast {
    constructor(renderToHtmlElem){
        this.renderToHtmlElem = renderToHtmlElem;
        this.selectedCardKey = null;
    }

    render(weather){
        this.renderToHtmlElem.innerHTML = ''

        let cardContainer = this._renderCards(weather);
        this.renderToHtmlElem.appendChild(cardContainer);

        let dayForecasts = weather.getForecastGroupdByDays()[this.selectedCardKey];
        new WeatherEveryThreeHoursCardView(this.renderToHtmlElem)
            .render(dayForecasts, this._dayHumanize(dayForecasts[0]))
    }

    _renderCards(weather) {
        let cardContainer = document.createElement("div");
        cardContainer.style.display = "flex";
        cardContainer.style.justifyContent = "space-around";


        let forecastsGroupedByDay = weather.getForecastGroupdByDays();

        if (this.selectedCardKey == null) {
            this._setDefaultselectedCardKey(forecastsGroupedByDay);
        }

        for (let [key, daysHourlyForecast] of Object.entries(forecastsGroupedByDay)) {
            let daysTemperatures = daysHourlyForecast.map((hourlyForecast) => {
                return hourlyForecast.main.temp_max;
            })
            let maxDayTemp = Math.max(...daysTemperatures)

            let maxDailyTempState = daysHourlyForecast.find((hourlyForecast) => {
                return hourlyForecast.main.temp_max == maxDayTemp;
            })

            let onClickCallback = (key) => {
                this.selectedCardKey = key;
                this.render(weather);
            };

            new DailyTemperatureCardView(cardContainer, onClickCallback)
                .render(maxDailyTempState, key, this.selectedCardKey);

        }
        return cardContainer;
    }

    _setDefaultselectedCardKey(daysGrouped) {
        this.selectedCardKey = Object.keys(daysGrouped)[0]
    }

    _dayHumanize(data){
        return moment(data.dt_txt).format('dddd')
    }
}

class DailyTemperatureCardView {
    constructor(renderToHtmlElem, onClickCallback){
        this.renderToHtmlElem = renderToHtmlElem;
        this.onClickCallback = onClickCallback;
    }


    render(dayData, key , selectedCardKey){
        let cardBody = document.createElement("div");

        cardBody.addEventListener("click", () => {
            this.onClickCallback(key);
        });

        if(key == selectedCardKey){
            cardBody.style.border = '2px solid black'
        }

        let cardBodyDay = document.createElement("div")
        cardBodyDay.innerHTML = moment(dayData.dt_txt).format('dddd');
        cardBody.appendChild(cardBodyDay);

        let cardBodyData = document.createElement("div")
        cardBodyData.innerHTML = dayData.dt_txt;
        cardBody.appendChild(cardBodyData);

        let cardBodyTemp = document.createElement("div");
        cardBodyTemp.innerHTML = dayData.main.temp_max
        cardBody.appendChild(cardBodyTemp);

        let cardBodyWeather = document.createElement("div");
        cardBodyWeather.innerHTML = dayData.weather[0].description
        cardBody.appendChild(cardBodyWeather);

        this.renderToHtmlElem.appendChild(cardBody);
    }
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
            headerTab.style.color = "white";
            headerTab.style.width = "100px";
            headerTab.style.padding = "10px ";
            headerTab.style.textAlign = "center ";
            headerTab.style.borderLeft = "1px solid white ";

            headerTab.addEventListener("click" , () => {
                 this.tabsClickHandler(tabConfig.key);
            })
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

    render(forecasts, currentDayName = 'Today') {
        let header = this._renderHeader();
        this.renderToHtmlElem.appendChild(header);

        let body = document.createElement("div");
        body.style.display = "flex";
        body.style.flexDirection = "column";

        let titles = [
            {
                title: currentDayName,
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
