/* J Carney, 2018 */

// initialize after page ready
$(document).ready(initialize);

// starting point for script
function initialize() {
    // main create returns a map
    mapSizer(myMap());

    // for testing, to load alternate scripts
    //getExternal();
};

// main flow to create map
function myMap() {
    // basemaps
    let tilesStreets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ'
    });
    let tilesAerial = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery   <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.satellite',
        accessToken: 'pk.eyJ1IjoiamhjYXJuZXkiLCJhIjoiY2pmbHE2ZTVlMDJnbTJybzdxNTNjaWsyMiJ9.hoiyrXTX3pOuEExAnhUtIQ'
    });
    let baseTilesets = {
        "Streets": tilesStreets,
        "Aerial": tilesAerial
    };

    // map, add one basemap
    var map = map = L.map('map',{
        center: [65.3129, -151.3130],
        zoom: 4,
        layers: [tilesStreets]
    });

    // add basemap control
    L.control.layers(baseTilesets).addTo(map);

    // declare data layerGroups
    let defaultLG;
    let majorLG;
    let moderateLG;
    let minorLG;
    let currentlyActiveLG;
    let severityTag = "tot_floods";

    // vars for managing Decade Slider tool and status
    let jsonResponse;
    let decadeArray;
    let decadeIndex = 0;
    let decadeSlider;
    let decadeToolStatus = 0;
    let oldValDecade = [1900,1909];

    // vars for managing Flood Count Slider tool and status
    let rangeFilter;
    let filterToolStatus = 0;
    let oldValFilter = [0,40];
    let filterLayer;

    // listeners for severity buttons
    setupSeverityFilterButtons();

    // create tools
    createControls();

    // async load xmlhttprequest object of json data type
    $.ajax("data/AlaskaFloodHistory.geojson", {
        dataType: "json",
        success: function(response){
            // get list of fields with "d_" in name (# floods by decades)
            decadeArray = processData(response);
            // store response
            jsonResponse = response;
            // Layer Groups to be made from ajax call = default, major, moderate, minor (communities with at least one flood of ___ severity)
            defaultLG = createPropSymbols(response);
            majorLG = createPropSymbolsFiltered(response, "tot_sev_major");
            moderateLG = createPropSymbolsFiltered(response, "tot_sev_moderate");
            minorLG = createPropSymbolsFiltered(response, "tot_sev_minor");

            // simulate a click for default layer
            $("#btnSevAll").click();
        }
    });

    // make array of attributes (fields) with "d_" in the name (# floods by decades)
    function processData(data) {
        // make array
        let attributesArray = [];
        // get properties of feature 1
        let properties = data.features[0].properties;
        // populate array
        for (let field in properties) {
            // only get attributes with pop
            if (field.indexOf("d_") > -1) {
                attributesArray.push(field);
            };
        };
        return attributesArray;
    }

    // filters features on creation depending on flood severity to make the default layers
    function createPropSymbolsFiltered (response, tag) {
        console.log(tag);
        return L.geoJson(response, {
            filter: function (feature, layer) {
                let count = feature.properties[tag];
                return count > 0;
            },
            pointToLayer: function (feature, latlng) {
                return pointToLayer(feature, latlng);
            }
        });
    }

    // remake the map with correct base layer depending on severity filter buttons
    function setupSeverityFilterButtons() {
        // listeners
        $("#btnSevAll").click(function() {
            severityButtonToggler("all");
        });
        $("#btnSevMaj").click(function() {
            severityButtonToggler("maj");
        });
        $("#btnSevMod").click(function() {
            severityButtonToggler("mod");
        });
        $("#btnSecMin").click(function() {
            severityButtonToggler("min");
        });
    }

    // Logic for add/remove layers for severity filter
    function severityButtonToggler (caller) {
        // feature count in layers
        let countAll = Number(defaultLG.getLayers().length);
        let countMaj = Number(majorLG.getLayers().length);
        let countMod = Number(moderateLG.getLayers().length);
        let countMin = Number(minorLG.getLayers().length);
        // logic
        if (caller === "all") {
            if ($("#btnSevAll").hasClass('active')) {
                // already active
                $("#btnSevAll").button('toggle');
            } else {
                // remove others
                try {
                    map.removeLayer(defaultLG);
                    console.log("cleared DEF");
                    map.removeLayer(majorLG);
                    console.log("cleared MAJ");
                    map.removeLayer(moderateLG);
                    console.log("cleared MOD");
                    map.removeLayer(minorLG);
                    console.log("cleared MIN");
                } catch (err) {
                    // pass
                    console.log('error?');
                }
                defaultLG.addTo(map);
                currentlyActiveLG = defaultLG;
                severityTag = "tot_floods";

                $("#cardCommunitiesShown").text("Count: " + countAll);
                // toggle button appearances
                if ($("#btnSevMaj").hasClass("active")) {$("#btnSevMaj").button('toggle');}
                if ($("#btnSevMod").hasClass("active")) {$("#btnSevMod").button('toggle');}
                if ($("#btnSecMin").hasClass("active")) {$("#btnSecMin").button('toggle');}
                // reset tools
                if (decadeToolStatus === 1) {$("#toggleDecadeSlider").click();}
                if (filterToolStatus === 1) {$("#toggleFilterSlider").click();}
            }
        } else if (caller === "maj") {
            if ($("#btnSevMaj").hasClass('active')) {
                // already active
                $("#btnSevMaj").button('toggle');
            } else {
                // remove others
                try {
                    map.removeLayer(defaultLG);
                    console.log("cleared DEF");
                    map.removeLayer(majorLG);
                    console.log("cleared MAJ");
                    map.removeLayer(moderateLG);
                    console.log("cleared MOD");
                    map.removeLayer(minorLG);
                    console.log("cleared MIN");
                } catch (err) {
                    // pass
                }

                majorLG.addTo(map);
                currentlyActiveLG = majorLG;
                severityTag = "tot_sev_major";

                $("#cardCommunitiesShown").text("Count: " + countMaj);
                // toggle button appearances
                if ($("#btnSevAll").hasClass("active")){$("#btnSevAll").button('toggle');}
                if ($("#btnSevMod").hasClass("active")){$("#btnSevMod").button('toggle');}
                if ($("#btnSecMin").hasClass("active")){$("#btnSecMin").button('toggle');}
                // reset tools
                if (decadeToolStatus === 1) {$("#toggleDecadeSlider").click();}
                if (filterToolStatus === 1) {$("#toggleFilterSlider").click();}
            }
        } else if (caller === "mod") {
            if ($("#btnSevMod").hasClass('active')) {
                // already active
                $("#btnSevMod").button('toggle');
            } else {
                // remove others
                try {
                    map.removeLayer(defaultLG);
                    console.log("cleared DEF");
                    map.removeLayer(majorLG);
                    console.log("cleared MAJ");
                    map.removeLayer(moderateLG);
                    console.log("cleared MOD");
                    map.removeLayer(minorLG);
                    console.log("cleared MIN");
                } catch (err) {
                    // pass
                }

                moderateLG.addTo(map);
                currentlyActiveLG = moderateLG;
                severityTag = "tot_sev_moderate";

                $("#cardCommunitiesShown").text("Count: " + countMod);
                // toggle button appearances
                if ($("#btnSevAll").hasClass("active")){$("#btnSevAll").button('toggle');}
                if ($("#btnSevMaj").hasClass("active")){$("#btnSevMaj").button('toggle');}
                if ($("#btnSecMin").hasClass("active")){$("#btnSecMin").button('toggle');}
                // reset tools
                if (decadeToolStatus === 1) {$("#toggleDecadeSlider").click();}
                if (filterToolStatus === 1) {$("#toggleFilterSlider").click();}
            }
        } else {
            if ($("#btnSecMin").hasClass('active')) {
                // already active
                $("#btnSecMin").button('toggle');
            } else {
                // remove others
                try {
                    map.removeLayer(defaultLG);
                    console.log("cleared DEF");
                    map.removeLayer(majorLG);
                    console.log("cleared MAJ");
                    map.removeLayer(moderateLG);
                    console.log("cleared MOD");
                    map.removeLayer(minorLG);
                    console.log("cleared MIN");
                } catch (err) {
                    // pass
                }

                minorLG.addTo(map);
                currentlyActiveLG = minorLG;
                severityTag = "tot_sev_minor";

                $("#cardCommunitiesShown").text("Count: " + countMin);
                // toggle button appearances
                if ($("#btnSevAll").hasClass("active")){$("#btnSevAll").button('toggle');}
                if ($("#btnSevMaj").hasClass("active")){$("#btnSevMaj").button('toggle');}
                if ($("#btnSevMod").hasClass("active")){$("#btnSevMod").button('toggle');}
                // reset tools
                if (decadeToolStatus === 1) {$("#toggleDecadeSlider").click();}
                if (filterToolStatus === 1) {$("#toggleFilterSlider").click();}
            }
        }
    };

    // setup tool controls
    function createControls () {
        // decade sequence slider
        decadeSlider = $("#decadeSlider").bootstrapSlider({
            handle: "custom",
            tooltip: "hide",
            tooltip_split: false,
            step:10,
            min: 1900,
            max: 2019,
            formatter: function(value){
                return value[0] + " - " + value[1];
            },
            enabled: false
        });

        // decade slider buttons start disabled
        $("#nextDecade").prop("disabled",true);
        $("#lastDecade").prop("disabled",true);

        // range filter
        rangeFilter = $("#rangeFilter").bootstrapSlider({
            tooltip: "hide",
            tooltip_split: true,
            formatter: function(value){
                return value;
            },
            enabled: false
        });

        // decade toggle
        $("#toggleDecadeSlider").on("click", function(ev){
            // turn on
            if ($("#toggleDecadeSlider[type=checkbox]").prop("checked")){
                decadeSlider.bootstrapSlider('setAttribute','enabled',true);
                decadeSlider.bootstrapSlider('setAttribute','tooltip','always');
                decadeSlider.bootstrapSlider('setValue',[1900,1909]); // reset value
                decadeSlider.bootstrapSlider('refresh');
                $("#nextDecade").prop("disabled",false);
                $("#lastDecade").prop("disabled",false);
                decadeToolStatus = 1;
                // turn off filter if needed
                if (filterToolStatus === 1) {
                    $("#toggleFilterSlider").click();
                }
                // Call function to make markers
                sequencePropSymbolsByDecade(decadeArray[decadeIndex],currentlyActiveLG);
                // update title
                $("#titleDecade").text("Floods by Decade: " + oldValDecade[0] + " to " + oldValDecade[1]);
                // turn off
            } else {
                decadeSlider.bootstrapSlider('setAttribute','tooltip','hide');
                decadeSlider.bootstrapSlider('setValue',[1900,1909]); // reset value
                decadeSlider.bootstrapSlider('refresh');
                decadeSlider.bootstrapSlider('disable');
                $("#nextDecade").prop("disabled",true);
                $("#lastDecade").prop("disabled",true);
                decadeToolStatus = 0;
                decadeIndex = 0; // reset index
                oldValDecade = [1900,1909];
                // update title
                $("#titleDecade").text("Floods by Decade");
                resetSymbols(currentlyActiveLG);
            }
        });

        // decade skip button listeners
        $("#nextDecade").click(function() {
            if (decadeToolStatus === 1) {
                // controls
                let val = decadeSlider.bootstrapSlider('getValue');
                if (val[0] === 2019 || val[1] === 2019) {
                    val = [2010, 2019];
                    decadeSlider.bootstrapSlider('setValue', val);
                    oldValDecade = val;
                } else {
                    val = [val[0] + 10, val[1] + 10];
                    decadeSlider.bootstrapSlider('setValue', val);
                    oldValDecade = val;
                }
                // get new index
                decadeIndex = getNewDecadeIndex(val);
                // update title
                $("#titleDecade").text("Floods by Decade: " + val[0] + " to " + val[1]);
                // call for map update
                sequencePropSymbolsByDecade(decadeArray[decadeIndex], currentlyActiveLG);
            }
        });

        $("#lastDecade").click(function() {
            if (decadeToolStatus === 1) {
                // control
                let val = decadeSlider.bootstrapSlider('getValue');
                if (val[0] === 1900 || val[1] === 1900) {
                    val = [1900, 1909];
                    decadeSlider.bootstrapSlider('setValue', val);
                    oldValDecade = val;
                } else {
                    val = [val[0] - 10, val[1] - 10];
                    decadeSlider.bootstrapSlider('setValue', val);
                    oldValDecade = val;
                }
                // get new index
                decadeIndex = getNewDecadeIndex(val);
                // update title
                $("#titleDecade").text("Floods by Decade: " + val[0] + " to " + val[1]);
                // call for map update
                sequencePropSymbolsByDecade(decadeArray[decadeIndex], currentlyActiveLG);
            }
        });

        // decade slider click listener
        decadeSlider.on("slideStop", function(ev) {
            if (decadeToolStatus === 1) {
                // control
                let val = decadeSlider.bootstrapSlider('getValue');
                // forward in time
                if ((val[0] + val[1]) >= (oldValDecade[0] + oldValDecade[1])) {
                    let max = Math.max(val[0],val[1]);
                    if (max === 2019){max=2020}
                    val = [max-10,max-1];
                    decadeSlider.bootstrapSlider('setValue',val);
                    oldValDecade = val;
                    // back in time
                } else {
                    let min = Math.min(val[0],val[1]);
                    val = [min,min+9];
                    decadeSlider.bootstrapSlider('setValue',val);
                    oldValDecade = val;
                }
                // get new index
                decadeIndex = getNewDecadeIndex(val);
                // update title
                $("#titleDecade").text("Floods by Decade: " + val[0] + " to " + val[1]);
                // call for map update
                sequencePropSymbolsByDecade(decadeArray[decadeIndex],currentlyActiveLG);
            }
        });

        // filter toggle
        $("#toggleFilterSlider").on("click", function(ev) {
            // turn on
            if ($("#toggleFilterSlider[type=checkbox]").prop("checked")){
                rangeFilter.bootstrapSlider('setAttribute','enabled',true);
                rangeFilter.bootstrapSlider('setAttribute','tooltip','always');
                rangeFilter.bootstrapSlider('setValue',[0,40]); // reset value
                rangeFilter.bootstrapSlider('refresh');
                filterToolStatus = 1;
                // turn off decade if needed
                if (decadeToolStatus === 1) {
                    $("#toggleDecadeSlider").click();
                }
                // remove active layer
                map.removeLayer(currentlyActiveLG);
                // make sure no filter layer is on
                try {
                    map.removeLayer(filterLayer);
                    console.log("filter layer removed");
                } catch (err) {
                    console.log("ERROR: no filter layer to be removed");
                }
                // new filter layer
                filterLayer = filterByFloodCount(0,1000,severityTag);
                // update title
                $("#titleFilter").text("Communities with " + oldValFilter[0] + " to " + oldValFilter[1] + " floods");
                // turn off
            } else {
                rangeFilter.bootstrapSlider('setAttribute','tooltip','hide');
                rangeFilter.bootstrapSlider('setValue',[0,40]); // reset value
                rangeFilter.bootstrapSlider('refresh');
                rangeFilter.bootstrapSlider('disable');
                filterToolStatus = 0;
                map.removeLayer(filterLayer);
                map.addLayer(currentlyActiveLG);
                resetSymbols(currentlyActiveLG);
                oldValFilter = [0,40];
                // update title
                $("#titleFilter").text("Communities with __ floods");
            }
        });

        // filter slider click listener
        rangeFilter.on("slideStop", function(ev) {
            if (filterToolStatus === 1) {
                // control
                let val = rangeFilter.bootstrapSlider('getValue');
                let lower = Math.min(val[0], val[1]);
                let upper = Math.max(val[0], val[1]);
                oldValFilter = [lower, upper];
                // call for map update
                map.removeLayer(currentlyActiveLG);
                map.removeLayer(filterLayer);
                filterLayer = filterByFloodCount(lower, upper, severityTag);
                // update title
                $("#titleFilter").text("Communities with " + lower + " to " + upper + " floods");
            }
        });
    };

    // update symbols for decade sequencing
    function sequencePropSymbolsByDecade(attribute, layerGroup) {
        let cardCount = 0;
        layerGroup.eachLayer(function (layer){
            // new radius
            let radius = calcPropRadius(Number(layer.feature.properties[attribute]));
            layer.setRadius(radius);
            // add to count
            cardCount = cardCount + Number(layer.feature.properties[attribute]);
            // make popup
            let popupContent = "<b>"+layer.feature.properties.city + "</b> showing " + "<b>" + layer.feature.properties[attribute] + "</b> floods.";
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius),
                closeButton: false
            });
        });
        $("#cardShowDecadeFloodCount").text(cardCount + " Floods");
        cardCount = 0;
    };

    // update symbols for filtering
    function filterByFloodCount(lower, upper, tag) {
        console.log(tag);
        let countComs = 0;
        let filterLayer = L.geoJson(jsonResponse, {
            filter: function(feature, layer) {
                let count = eval("feature.properties."+tag);
                if ((count >= lower && count <= upper) && count > 0) {
                    countComs = countComs + 1;
                    return true;
                } else {
                    return false;
                }
            },
            pointToLayer: function (feature, latlng) {
                return pointToLayer(feature, latlng);
            }
        }).addTo(map);
        $("#cardShowRangeFilterCount").text(countComs + " Communities");
        countComs = 0;
        return filterLayer;
    };

    // update symbols for default view
    function resetSymbols(layerGroup) {
        // get style for markers
        let geojsonMarkerOptions = defaultMarkerOptions();
        // on each feature
        layerGroup.eachLayer(function (layer){
            // new radius
            layer.setStyle(geojsonMarkerOptions);

            // new radius
            let radius = calcPropRadius(Number(layer.feature.properties.tot_floods));
            layer.setRadius(radius);

            // make popup
            let popupContent = "<b>"+layer.feature.properties.city + "</b> showing " + "<b>" + layer.feature.properties.tot_floods + "</b> floods.";
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-geojsonMarkerOptions.radius),
                closeButton: false
            });
        });
        $("#cardShowDecadeFloodCount").text("0 Floods");
        $("#cardShowRangeFilterCount").text("0 Communities");
    };

    // parent function to vectorize features
    function createPropSymbols(data){
        // iterate through all features in json
        return L.geoJson(data, {
            // for each feature, call function to vectorize it
            pointToLayer: function (feature, latlng) {
                return pointToLayer(feature, latlng);
            }
        });
    };

    // marker styling and proportial symbols, this is called for each feature from createPropSymbols
    function pointToLayer(feature, latlng) {
        //make a style for markers
        let geojsonMarkerOptions = defaultMarkerOptions();
        // marker
        let marker = L.circleMarker(latlng, geojsonMarkerOptions);

        // new radius
        let radius = calcPropRadius(Number(feature.properties.tot_floods));
        marker.setRadius(radius);

        // make popup
        let popupContent = "<b>"+feature.properties.city + "</b> showing " + "<b>" + feature.properties.tot_floods + "</b> floods.";
        marker.bindPopup(popupContent, {
            offset: new L.Point(0,-geojsonMarkerOptions.radius),
            closeButton: false
        });
        // add listeners for hover popup and info panel
        addListeners(marker);
        // return the marker to the caller to be added to map
        return marker;
    };

    // called on creation of each marker to add listeners to it
    function addListeners (marker){
        marker.on({
            mouseover: function(){
                this.openPopup()
            },
            mouseout: function(){
                this.closePopup();
            },
            click: function () {
                // populate the "Community Overview" info panel with desc of clicked marker
                // city name
                let city =
                    "<b>"+marker.feature.properties.city + "</b>" + "<i> (" + marker.feature.properties.pronunciation + ")</i>";
                $("#city").html(city);
                // watershed
                let shed =
                    "HUC12: <i>" + marker.feature.properties.watershed + "</i>";
                $("#shed").html(shed);
                // desc
                let desc =
                    "<p>" + marker.feature.properties.desc + "</p>";
                $("#desc").html(desc);
            }
        });
    };

    // called to calculate scaled marker radius for proportional symbols
    function calcPropRadius(attValue) {
        let scaleFactor = 50;
        let area = attValue * scaleFactor;
        return Math.sqrt(area / Math.PI);
    };

    // convert year to decade index
    function getNewDecadeIndex(val) {
        let index;
        switch (val[1]) {
            case 1909:
                index = 0;
                break;
            case 1919:
                index = 1;
                break;
            case 1929:
                index = 2;
                break;
            case 1939:
                index = 3;
                break;
            case 1949:
                index = 4;
                break;
            case 1959:
                index = 5;
                break;
            case 1969:
                index = 6;
                break;
            case 1979:
                index = 7;
                break;
            case 1989:
                index = 8;
                break;
            case 1999:
                index = 9;
                break;
            case 2009:
                index = 10;
                break;
            case 2019:
                index = 11;
                break;
        }
        return index;
    }

    // for circle markers
    function  defaultMarkerOptions() {
        return {
            radius: 6,
            fillColor: "#b8060b",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.6
        };
    }

    // return map object
    return map;
};

// get screen size per BS breaks
function mapSizer(map) {
    // window resize listener
    $(window).on("resize", function () {
        let result = $('#device-size-detector').find('div:visible').first().attr('id');
        // set map size depending on breakpoint
        if (result === "xs" || result === "sm" || result === "md") {
            $("#map").css({"height": "50vh"});
        } else {
            $("#map").css({"height": "85vh"});
        }
        map.invalidateSize();
    }).trigger("resize");
}

// load other JS files if needed
function getExternal() {
    $.getScript("js/geojson.js", function() {
        console.log("external script loaded");
    });
};


