const http = require('http')
const Sequelize = require('sequelize');
const sqlite3 = require('sqlite3');

const sequelize = new Sequelize('sqlite:./sqlite_db.db');

const Model = Sequelize.Model;
class City extends Model {}
City.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Name: {
        type: Sequelize.STRING,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'city',
    tableName: 'Cities',
    timestamps: false
});

class Location extends Model {}
Location.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    GoogleMapsUrl: {
        type: Sequelize.STRING,
        allowNull: true
    },
    cityId: {
        type: Sequelize.INTEGER,
        references: {
            model: 'city',
            key: "id"
        }
    }
}, {
    sequelize,
    modelName: 'location',
    tableName: 'Locations',
    timestamps: false
});

City.hasMany(Location)
Location.belongsTo(City)



let server = http.createServer(async (req, res) => {

    let urlBits = req.url.split('/')
    // console.log(urlBits)
    switch (urlBits[1]) {
        case 'cities': {
            switch (req.method) {
                case "GET": {
                    if (urlBits[2] == null) { //collection get
                        try {
                            let cities = await City.findAll().catch(e => {
                                res.writeHead(500);
                                res.end();
                                console.error(e);
                            });

                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            // console.log(cities)
                            res.end(JSON.stringify(cities));
                        } catch (e) {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        }
                    } else { //resource get
                        try {
                            let cityId = Number.parseInt(urlBits[2]);
                            if (isNaN(cityId)) {
                                res.writeHead(400);
                                res.end();
                                return;
                            }

                            let city = await City.findOne({
                                where: {
                                    id: cityId
                                },
                                include: [{
                                    model: Location
                                }]
                            }).catch(e => {
                                res.writeHead(500);
                                res.end();
                                console.error(e);
                            });

                            if (city == null) {
                                res.writeHead(404);
                                res.end();
                            } else {
                                res.writeHead(200, {
                                    'Content-Type': 'application/json'
                                });
                                res.end(JSON.stringify(city));
                            }
                        } catch (e) {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        }
                    }
                    break;
                }
                case "POST": {
                    let body = "";

                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        body = JSON.parse(body);

                        if (body.name == null) {
                            console.log("name missing")
                            res.writeHead(400);
                            res.end();
                            return;
                        }

                        let newCity = City.build({
                            Name: body.name,
                            locations: null
                        });
                        try {
                            newCity.save().then(() => {
                                res.writeHead(201, {
                                    Location: `${req.headers.host}/cities/${newCity.id}`
                                });
                                res.end();
                            });
                        } catch (e) {
                            res.writeHead(500);
                            res.end();
                            console.error(e)
                        }
                    });
                    break;
                }
                case "PUT": {
                    if (urlBits[2] == null) {
                        console.log("no id");
                        res.writeHead(400);
                        res.end()
                        return;
                    }

                    let cityId = Number.parseInt(urlBits[2]);
                    if (isNaN(cityId)) {
                        res.writeHead(400);
                        res.end();
                        return;
                    }

                    let body = "";

                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        body = JSON.parse(body);

                        if (body.name == null) {
                            console.log("name missing");
                            req.writeHead(400);
                            req.end();
                            return;
                        }

                        let cityToBeUpdated = await City.findOne({
                            where: {
                                id: cityId
                            }
                        }).catch(e => {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        });

                        if (cityToBeUpdated == null) {
                            res.writeHead(404);
                            res.end();
                        } else {
                            cityToBeUpdated.id = cityId
                            cityToBeUpdated.Name = body.name;
                            cityToBeUpdated.save().then(() => {
                                res.writeHead(200);
                                res.end();
                            });
                        }
                    });
                    break;
                }
                case "DELETE": {
                    if (urlBits[2] == null) {
                        City.destroy({
                            where: {}
                        }).then(() => {
                            res.writeHead(200);
                            res.end();
                        });
                        return;
                    }

                    let cityId = Number.parseInt(urlBits[2]);
                    if (isNaN(cityId)) {
                        res.writeHead(400);
                        res.end();
                        return;
                    }

                    let cityToBeDeleted = await City.findOne({
                        where: {
                            id: cityId
                        }
                    }).catch(e => {
                        res.writeHead(500);
                        res.end();
                        console.error(e);
                    });

                    if (cityToBeDeleted == null) {
                        res.writeHead(404);
                        res.end();
                    } else {
                        console.log(cityToBeDeleted)
                        await City.destroy({
                            where: {
                                id: cityId
                            }
                        }).then(
                            () => {
                                res.writeHead(200);
                                res.end();
                            }
                        ).catch(
                            (e) => {
                                console.error(e)
                                res.writeHead(500);
                                res.end();
                            }
                        );
                    }
                    break;
                }
                default: {
                    res.writeHead(405);
                    res.end();
                    break;
                }
            }
            break;
        }
        case 'locations': {
            switch (req.method) {
                case "GET": {
                    if (urlBits[2] == null) { //collection get
                        try {
                            let locations = await Location.findAll().catch(e => {
                                res.writeHead(500);
                                res.end();
                                console.error(e);
                            });

                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.end(JSON.stringify(locations));
                        } catch (e) {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        }
                    } else {
                        try {
                            let locationId = Number.parseInt(urlBits[2]);
                            if (isNaN(locationId)) {
                                res.writeHead(400);
                                res.end();
                                return;
                            }

                            let location = await Location.findOne({
                                where: {
                                    id: locationId
                                }
                            }).catch(e => {
                                res.writeHead(500);
                                res.end();
                                console.error(e);
                            });

                            if (location == null) {
                                res.writeHead(404);
                                res.end();
                            } else {
                                res.writeHead(200, {
                                    'Content-Type': 'application/json'
                                });
                                res.end(JSON.stringify(location));
                            }
                        } catch (e) {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        }
                    }
                    break;
                }
                case "POST": {
                    let body = "";

                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        body = JSON.parse(body);

                        if (body.name == null) {
                            console.log("name missing")
                            res.writeHead(400);
                            res.end();
                            return;
                        }

                        console.log(body);

                        let newLocation = Location.build({
                            Name: body.name,
                            GoogleMapsUrl: body.googleMapsLink,
                            cityId: body.cityId
                        });

                        newLocation.save().then(() => {
                            res.writeHead(201, {
                                Location: `${req.headers.host}/locations/${newLocation.id}`
                            });
                            res.end();
                        });
                    });
                    break;
                }
                case "PUT": {
                    if (urlBits[2] == null) {
                        console.log("no id");
                        res.writeHead(405);
                        res.end()
                        return;
                    }

                    let locationId = Number.parseInt(urlBits[2]);
                    if (isNaN(locationId)) {
                        res.writeHead(400);
                        res.end();
                        return;
                    }

                    let body = "";

                    req.on('data', chunk => body += chunk);
                    req.on('end', async () => {
                        body = JSON.parse(body);

                        if (body.name == null) {
                            console.log("name missing");
                            req.writeHead(400);
                            req.end();
                            return;
                        }

                        let locationToBeUpdated = await Location.findOne({
                            where: {
                                id: locationId
                            }
                        }).catch(e => {
                            res.writeHead(500);
                            res.end();
                            console.error(e);
                        });

                        if (locationToBeUpdated == null) {
                            res.writeHead(404);
                            res.end();
                        } else {
                            locationToBeUpdated.id = locationId;
                            locationToBeUpdated.Name = body.name;
                            locationToBeUpdated.GoogleMapsUrl = body.googleMapsUrl;
                            locationToBeUpdated.save().then(() => {
                                res.writeHead(200);
                                res.end();
                            });
                        }
                    });
                    break;
                }
                case "DELETE": {
                    if (urlBits[2] == null) {
                        Location.destroy({
                            where: {}
                        }).then(() => {
                            res.writeHead(200);
                            res.end();
                        });
                        return;
                    }

                    let locationId = Number.parseInt(urlBits[2]);
                    if (isNaN(locationId)) {
                        res.writeHead(400);
                        res.end();
                        return;
                    }

                    let locationToBeDeleted = await Location.findOne({
                        where: {
                            id: locationId
                        }
                    }).catch(e => {
                        res.writeHead(500);
                        res.end();
                        console.error(e);
                    });

                    if (locationToBeDeleted == null) {
                        res.writeHead(404);
                        res.end();
                    } else {
                        // console.log(locationToBeDeleted)
                        await Location.destroy({
                            where: {
                                id: locationId
                            }
                        }).then(
                            () => {
                                res.writeHead(200);
                                res.end();
                            }
                        ).catch(
                            (e) => {
                                console.error(e)
                                res.writeHead(500);
                                res.end();
                            }
                        );
                    }
                    break;
                }
                default: {
                    res.writeHead(405);
                }
            }
            break;
        }
        default: {
            res.writeHead(400);
            res.end();
            break;
        }
    }
})

server.listen(8000)