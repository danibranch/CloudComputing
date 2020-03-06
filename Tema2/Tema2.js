const http = require('http')
const Sequelize = require('sequelize');

const sequelize = new Sequelize('sqlite:./sqlite_db.db');

const Model = Sequelize.Model;
class City extends Model {}
City.init({
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
    Id: {
        type: Sequelize.INTEGER,
        allowNull: true
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
                    if (urlBits[2] != null) {

                        let cityId = Number.parseInt(urlBits[2]);
                        let city = await City.findOne({
                            where: {
                                id: cityId
                            }
                        })

                        if (city == null) {
                            res.writeHead(404);
                            res.end();
                        } else {
                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.end(JSON.stringify(city))
                        }
                    } else {
                        let data = await City.findAll();

                        res.writeHead(200, {
                            'Content-Type': 'application/json'
                        });
                        res.end(JSON.stringify(data));
                    }
                    break;
                }
                case "POST": {
                    let body = "";

                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        body = JSON.parse(body);
                        console.log(body);

                        if (body.name == null) {
                            console.log("name missing")
                            return;
                        }

                        let newCity = City.build({
                            Name: body.name
                        });

                        newCity.save().then(() => {
                            res.writeHead(201);
                            res.end()
                        });
                    });
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
                        // let city = data.filter(city => city.locations.find(location => location.id == id));
                        if (city == null) {
                            res.writeHead(404);
                            res.end();
                        } else {
                            res.writeHead(200, {
                                'Content-Type': 'application/json'
                            });
                            res.end(JSON.stringify(city.locations))
                        }
                    } else {
                        res.writeHead(200, {
                            'Content-Type': 'application/json'
                        });
                        let locations = []
                        for (let city of data) {
                            locations.push(...city.locations)
                        }
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
