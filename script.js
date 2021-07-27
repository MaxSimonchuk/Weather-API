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
    static get ICON_URL(){
        return "http://openweathermap.org/img/wn"
    }

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

    static getIconUrl(iconName){
        return `${WeatherServiceAPI.ICON_URL}/${iconName}@2x.png`
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
    getCurrentWeatherIcon(){
        return this.getCurrentWeather().weather[0].icon;
    }
    getCurrentWeatherTemp() {
        return this.getCurrentWeather().main.temp.toFixed(0);
    }
    getCurrentWeatherRealFeel() {
        return this.getCurrentWeather().main.feels_like;
    }

    getCurrentDaySunTime() {
        let sunrise = this.resp.city.sunrise*1000;
        let sunset = this.resp.city.sunset*1000;
        let durration = this._getCurrentDayDuration(sunset, sunrise);

        return {
            sunrise: moment(new Date(sunrise), "HH:mm:ss").format("h:mm A"),
            sunset: moment(new Date(sunset), "HH:mm:ss").format("h:mm A"),
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
         ).format("HH:mm ")
        return res
    }
};

class Search {
    constructor(renderToHtmlElem, onSearchCahngeHandler){
        this.renderToHtmlElem = renderToHtmlElem;
        this.onSearchCahngeHandler = onSearchCahngeHandler;
    }

    render(city){
        let search = document.createElement("input");
        search.value = city;
        search.classList.add("search_city");
        this.renderToHtmlElem.appendChild(search);
        search.addEventListener('change', (event) => {
            this.onSearchCahngeHandler(event.target.value) ;
        })
    }
}

class DayForecast {
    constructor(renderToHtmlElem){
        this.renderToHtmlElem = renderToHtmlElem;
        this.selectedCardKey = AppStorage.SELECTED_FORECAST_DAY_KEY;
    }

    render(weather){
        this.renderToHtmlElem.innerHTML = ''

        let cardContainer = this._renderCards(weather);
        this.renderToHtmlElem.appendChild(cardContainer);

        let dayForecasts = weather.getForecastGroupdByDays()[AppStorage.SELECTED_FORECAST_DAY_KEY];
        new WeatherEveryThreeHoursCardView(this.renderToHtmlElem)
            .render(dayForecasts, this._dayHumanize(dayForecasts[0]))
    }

    _renderCards(weather) {
        let cardContainer = document.createElement("div");
        cardContainer.classList.add("card_container")

        let forecastsGroupedByDay = weather.getForecastGroupdByDays();

        if (!AppStorage.SELECTED_FORECAST_DAY_KEY) {
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
                AppStorage.SELECTED_FORECAST_DAY_KEY = key;
                this.render(weather);
            };

            new DailyTemperatureCardView(cardContainer, onClickCallback)
                .render(maxDailyTempState, key, AppStorage.SELECTED_FORECAST_DAY_KEY);
        }
        return cardContainer;
    }

    _setDefaultselectedCardKey(daysGrouped) {
        AppStorage.SELECTED_FORECAST_DAY_KEY = Object.keys(daysGrouped)[0]
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
        cardBody.classList.add("card_body")

        cardBody.addEventListener("click", () => {
            this.onClickCallback(key);
        });

        if(key == selectedCardKey){
            cardBody.classList.add("active_tabs")
        }

        let cardBodyDay = document.createElement("div")
        cardBodyDay.innerHTML = moment(dayData.dt_txt).format('dddd');
        cardBody.appendChild(cardBodyDay);
        cardBodyDay.classList.add("card_body-day", "main_text")

        let cardBodyData = document.createElement("div")
        cardBodyData.innerHTML = moment(dayData.dt_txt).format("MMM D");
        cardBody.appendChild(cardBodyData);
        cardBodyData.classList.add("card_body-data", "main_text")

        new Icon(cardBody).render(dayData.weather[0].icon)

        let cardBodyTemp = document.createElement("div");
        cardBodyTemp.innerHTML = dayData.main.temp_max.toFixed(0)+ "°C";
        cardBody.appendChild(cardBodyTemp);
        cardBodyTemp.classList.add("temp_block", "main_text");

        let cardBodyWeather = document.createElement("div");
        cardBodyWeather.innerHTML = dayData.weather[0].description
        cardBody.appendChild(cardBodyWeather);
        cardBodyWeather.classList.add("card_body-weather", "main_text");

        this.renderToHtmlElem.appendChild(cardBody);
    }
}

class WeatherTabsBlockView {
    constructor(renderToHtmlElem,tabsClickHandler){
        this.renderToHtmlElem = renderToHtmlElem;
        this.tabsClickHandler = tabsClickHandler;

        this.renderToHtmlElem.innerHTML = ''
    }

    render(tabsConfig) {
        tabsConfig.forEach((tabConfig) => {
            let headerTab = document.createElement("div");
            this.renderToHtmlElem.appendChild(headerTab);
            headerTab.innerHTML = tabConfig.title;
            headerTab.classList.add("header_tab", "main_text")

            if (AppStorage.SELECTED_NAV_TAB_KEY == tabConfig.key){
                headerTab.classList.add("tab_active")
            }
            headerTab.addEventListener("click" , () => {
                 this.tabsClickHandler(tabConfig.key);
            })
        })
    }
}

class Icon {
    constructor(renderToHtml){
        this.renderToHtml = renderToHtml
    }

    render(iconName){
        let iconBlocks = document.createElement("div");
        let img = document.createElement("img");
        img.src = WeatherServiceAPI.getIconUrl(iconName);
        iconBlocks.appendChild(img);
        this.renderToHtml.appendChild(iconBlocks);
    }

    static getHtml(iconName){
        let iconBlocks = document.createElement("div");
        let img = document.createElement("img");
        img.src = WeatherServiceAPI.getIconUrl(iconName);
        iconBlocks.appendChild(img);
        return iconBlocks.innerHTML
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
        body.classList.add("current_block-info")

        let iconBlock = document.createElement("div");
        iconBlock.innerHTML = todayWeatherData.getCurrentWeatherDesc();
        body.appendChild(iconBlock);
        iconBlock.classList.add("icon_block", "main_text")
        new Icon(iconBlock).render(todayWeatherData.getCurrentWeatherIcon())

        let temperatureBlock = document.createElement("div");
        temperatureBlock.innerHTML = todayWeatherData.getCurrentWeatherTemp() + "°C";
        body.appendChild(temperatureBlock);
        temperatureBlock.classList.add("temp_block", "main_text")

        let temperatureBlockRealFeel = document.createElement("div");
        temperatureBlockRealFeel.innerHTML = "Real Feel " + todayWeatherData.getCurrentWeatherRealFeel().toFixed(0) + "°";
        temperatureBlock.appendChild(temperatureBlockRealFeel);
        temperatureBlockRealFeel.classList.add("real-feel_block", "main_text")

        let detailsBlock = document.createElement("div");
        body.appendChild(detailsBlock);
        detailsBlock.classList.add("details_block")

        let sunriseBlock = document.createElement("div");
        sunriseBlock.innerHTML = "Sunrise: " + todayWeatherData.getCurrentDaySunTime().sunrise;
        detailsBlock.appendChild(sunriseBlock)
        sunriseBlock.classList.add("block_sunr-suns-dur", "main_text")

        let sunsetBlock = document.createElement("div");
        sunsetBlock.innerHTML =  "Sunset: " + todayWeatherData.getCurrentDaySunTime().sunset;
        detailsBlock.appendChild(sunsetBlock);
        sunsetBlock.classList.add("block_sunr-suns-dur", "main_text")

        let durationBlock = document.createElement("div");
        durationBlock.innerHTML = "Duration: " + todayWeatherData.getCurrentDaySunTime().durration;
        detailsBlock.appendChild(durationBlock);
        durationBlock.classList.add("block_sunr-suns-dur", "main_text")

        this.renderToHtmlElem.appendChild(body);
    }

    _renderHeader(todayWeatherData) {
        let header = document.createElement("div");
        header.classList.add("current_header")

        let headerTitle = document.createElement("div");
        headerTitle.innerHTML = "CURRENT WEATHER"
        headerTitle.classList.add("current_title", "main_text")

        let headerDate = document.createElement("div");
        headerDate.innerHTML = moment(todayWeatherData.dt_txt).format('DD.MM.YYYY');
        headerDate.classList.add("current_title", "main_text")

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

    render(forecasts, currentDayName = 'TODAY') {
        let header = this._renderHeader();
        this.renderToHtmlElem.appendChild(header);

        let body = document.createElement("div");
        body.appendChild(header);
        body.classList.add("hourly_block-info")

        let tableConfig = this.tableConfig(currentDayName, forecasts)

        tableConfig.forEach((config) => {
            let newRow = document.createElement('div');
            newRow.classList.add("newrow_forecast")
            body.appendChild(newRow)

            let title = document.createElement('div');
            title.classList.add("today_block", "main_text")
            title.innerHTML = config.title
            newRow.appendChild(title)

            config.data.forEach((text) => {
                let data = document.createElement('div');
                data.classList.add("forecast_table", "main_text")

                data.innerHTML = text
                newRow.appendChild(data)
            })
        })

        this.renderToHtmlElem.appendChild(body);
    }

    tableConfig(currentDayName, forecasts) {
        return [
            {
                title: currentDayName,
                data: forecasts.map((forecast) => {
                    return moment(forecast.dt_txt).format('ha')
                })
            },
            {
                title: '',
                data: forecasts.map((forecast) => {
                    return Icon.getHtml(forecast.weather[0].icon)
                })
            },
            {
                title: 'Forecast',
                data: forecasts.map((forecast) => {
                    return forecast.weather[0].description
                })
            },
            {
                title: 'Temp (°C)',
                data: forecasts.map((forecast) => {
                    return forecast.main.temp.toFixed(0) + "°"
                })
            },
            {
                title: 'RealFeel',
                data: forecasts.map((forecast) => {
                    return  forecast.main.feels_like.toFixed(0) + "°"
                })
            },
            {
                title: 'Wind(km/h)',
                data: forecasts.map((forecast) => {
                    return forecast.wind.speed.toFixed(0) + " ESE"
                })
            }];
    }

    _renderHeader() {
        let header = document.createElement("div");
        header.innerHTML = "HOURLY";
        header.classList.add("hourly_title", "main_text")
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
        currentWeatherBlock.classList.add("current_block")

        let hourlyWeatherBlock = document.createElement("div");
        new WeatherEveryThreeHoursCardView(hourlyWeatherBlock).render(todayWeatherData.getWeatherForecast(6));
        this.renderToHtmlElem.appendChild(hourlyWeatherBlock);
        hourlyWeatherBlock.classList.add("hourly_block")

        this.renderToHtmlElem.classList.add("today_view");
    }
}

class AppStorage {
    static set SELECTED_NAV_TAB_KEY(setSelectedNavTabsKey){
        this.setSelectedNavTabsKey = setSelectedNavTabsKey
    }

    static get SELECTED_NAV_TAB_KEY(){
        return this.setSelectedNavTabsKey
    }

    static set SELECTED_FORECAST_DAY_KEY(setSelectedForecstDayKey){
        this.setSelectedForecstDayKey = setSelectedForecstDayKey
    }
    static get SELECTED_FORECAST_DAY_KEY(){
        return this.setSelectedForecstDayKey
    }

    static set CITY_WEATHER(weatherResp){
        this.weatherResp = weatherResp
    }
    static get CITY_WEATHER(){
        return this.weatherResp
    }

}

class Main {
    static get TAB_KEYS() {
        return {
            TODAY: "today",
            FORECAST: 'forecast'
        }
    }

    static get TABS_CONFIG() {
        return [
            {
                title: "Today",
                key: Main.TAB_KEYS.TODAY
            },
            {
                title: "5-day forecast",
                key: Main.TAB_KEYS.FORECAST
            }
        ]
    }

    constructor(renderToHtmlElem){
        this.renderToHtmlElem = renderToHtmlElem;
        AppStorage.SELECTED_NAV_TAB_KEY = Main.TAB_KEYS.TODAY;
        this.renderToHtmlElem.classList.add("wrapper")
    }

    render(cityWeather){
        AppStorage.CITY_WEATHER = new WeatherModel(cityWeather);

        this.renderToHtmlElem.innerHTML = ''
        this._addContainersToDOM();

        new Search(this.searchContainer, this._onCityChanged.bind(this))
            .render(AppStorage.CITY_WEATHER.getCityName());

        new WeatherTabsBlockView(this.tabsContainer, this._tabsClickHandler.bind(this))
            .render(Main.TABS_CONFIG);

        this._selectTab(AppStorage.SELECTED_NAV_TAB_KEY)
    }

    _addContainersToDOM() {
        this.searchContainer = document.createElement("div");
        this.searchContainer.classList.add("header_search");

        let titleHeader = document.createElement("div");
        titleHeader.innerHTML = "MY WEATHER";
        this.searchContainer.appendChild(titleHeader);
        titleHeader.classList.add("header_title", "main_text");
        this.renderToHtmlElem.appendChild(this.searchContainer);

        this.tabsContainer = document.createElement("div");
        this.renderToHtmlElem.appendChild(this.tabsContainer);
        this.tabsContainer.classList.add("tabs_container");

        this.weatherContainer = document.createElement("div");
        this.renderToHtmlElem.appendChild(this.weatherContainer);
    }

    _onCityChanged(cityName) {
        WeatherServiceAPI
            .getWeatherByCoords(
                new WeatherByCityDTO(cityName)
            )
            .then(this.render.bind(this))
            .catch((errMessage) => {
                this.weatherContainer.innerHTML = errMessage
                this.weatherContainer.classList.add("message_none")
                let pageNotFound = document.createElement("div");
                this.weatherContainer.appendChild(pageNotFound);
                pageNotFound.classList.add("block_page-notfound")
            })
    }

    _selectTab(key) {
        this._tabsClickHandler(key);
    }

    _tabsClickHandler(key) {
        AppStorage.SELECTED_NAV_TAB_KEY = key

        new WeatherTabsBlockView(this.tabsContainer, this._tabsClickHandler.bind(this))
            .render(Main.TABS_CONFIG);

        this.weatherContainer.innerHTML = ''

        if (key == Main.TAB_KEYS.TODAY) {
            new TodayView(this.weatherContainer).render(AppStorage.CITY_WEATHER);
        } else if (key == Main.TAB_KEYS.FORECAST) {
            new DayForecast(this.weatherContainer).render(AppStorage.CITY_WEATHER);
        }
    }
}

let main = new Main(document.body)

if (!navigator.geolocation) {
    WeatherServiceAPI
        .getWeatherByCoords(
            new WeatherByCityDTO(WeatherServiceAPI.NATIVE_CITY)
        ).then(main.render.bind(main))
} else {
    navigator.geolocation.getCurrentPosition((position) => {

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        WeatherServiceAPI
            .getWeatherByCoords(
                new WeatherByCoordsDTO(lat, lon)
            )
            .then(main.render.bind(main))

    }, () => {
        WeatherServiceAPI
            .getWeatherByCoords(
                new WeatherByCityDTO(WeatherServiceAPI.NATIVE_CITY)
            )
            .then(main.render.bind(main))
    });
}
