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
    tableName: 'Cities'
});

class Location extends Model {}
Location.init({
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true
    },
    Name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    GoogleMapsUrl: {
        type: Sequelize.STRING,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'location',
    tableName: 'locations'
})




let server = http.createServer(async (req, res) => {

    let urlBits = req.url.split('/')
    console.log(urlBits)
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
                                }
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
                            Name: body.name
                        });

                        newCity.save().then(() => {
                            res.writeHead(201, {
                                Location: `${req.headers.host}/cities/${newCity.id}`
                            });
                            res.end();
                        });
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

                        if (city == null) {
                            res.writeHead(404);
                            res.end();
                        } else {
                            cityToBeUpdated.name = body.name;
                            cityToBeUpdated.save().then(() => {
                                res.writeHead(204);
                                res.end();
                            });
                        }
                    });
                    break;
                }
                case "DELETE": {
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
                    res.end()
                }
                break;
            }
        }
        case 'locations': {
            switch (req.method) {
                case "GET": {
                    if (urlBits[2] != null) {
                        let id = Number.parseInt(urlBits[2]);
                        console.log(id);
                        // let city = data.filter(city => city.locations.find(location => location.id == id));
                        // if (city == null) {
                        //     res.writeHead(404);
                        //     res.end();
                        // } else {
                        //     res.writeHead(200, {
                        //         'Content-Type': 'application/json'
                        //     });
                        //     res.end(JSON.stringify(city.locations))
                        // }
                    } else {
                        res.writeHead(200, {
                            'Content-Type': 'application/json'
                        });
                        let locations = []
                        // for (let city of data) {
                        //     locations.push(...city.locations)
                        // }
                        res.end(JSON.stringify(locations));
                    }
                }
                default: {
                    res.writeHead(405);
                }
            }
        }
    }
})

server.listen(8000)
