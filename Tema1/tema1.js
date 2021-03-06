let https = require("https")
let http = require('http');
let fs = require('fs');
let querystring = require('querystring');
let handlebars = require("handlebars")

let token = null;
let logs = {
    apiRequests: [],
    serverRequests: []
};

let server = http.createServer(async (request, response) => {
    let time = (new Date()).getTime();
    let message;
    switch (request.url) {
        case '/': {       
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });

            let data = await getPlaylistInfoAsync();

            let content = fs.readFileSync("./Views/index.hbs");
            let template = handlebars.compile(content.toString());
            let output = template(data);
            message = output
            response.end(output);
            break;
        }
        // case "/metrics": {
        //     response.writeHead(200, {
        //         'Content-Type': 'text/html'
        //     });

        //     let content = fs.readFileSync("./Views/metrics.hbs");
        //     let template = handlebars.compile(content.toString());
        //     let data = {
        //         rawData: logs,
        //         stringData: JSON.stringify(logs)
        //     }
        //     let output = template(logs)
        //     message = output;
        //     response.end(output);
        //     break;
        // }
        case "/metrics": {
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });
            let data = {
                logs: logs,
                avgServerResponseTime: avgResponseTime(logs.serverRequests),
                avgRandomOrgResponseTime: avgResponseTime(logs.apiRequests.filter(x => x.type == "randomOrg-number")),
                avgSpotifyTokenResponseTime: avgResponseTime(logs.apiRequests.filter(x => x.type == "spotify-token")),
                avgSpotifyPlaylistsResponseTime: avgResponseTime(logs.apiRequests.filter(x => x.type == "spotify-playlists")),
                avgSpotifyPlaylistTracksResponseTime: avgResponseTime(logs.apiRequests.filter(x => x.type == "spotify-playlist-tracks"))
            }
            message = JSON.stringify(data)
            response.end(message);
            break;
        }
        case "/api/callApis": {
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });

            let data = await getPlaylistInfoAsync();
            message = JSON.stringify(data);
            response.end(message);
            break;
        }
        default: {
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });
            message = "404";
            response.end("404");
            break;
        }
    }

    logs.serverRequests.push({
        request: {
            "url": request.url,
            "headers": request.headers,
            "method": request.method
        },
        response: {
            "statusCode": response.statusCode,
            "statusMessage": response.statusMessage,
            "content": message
        },
        dateTime: new Date(),
        responseTime: (new Date()).getTime() - time
    });
});

server.listen(8081);


function callRandomOrgApi(maxNumber) {
    const randomOrgApiKey = JSON.parse(fs.readFileSync('./app_settings.json')).randomOrgApiKey;
    let time = (new Date()).getTime();
    const data = JSON.stringify({
        "jsonrpc": "2.0",
        "method": "generateIntegers",
        "params": {
            "apiKey": randomOrgApiKey,
            "n": 1,
            "min": 0,
            "max": maxNumber,
            "replacement": true
        },
        "id": 42
    })


    const options = {
        hostname: 'api.random.org',
        port: 443,
        path: '/json-rpc/2/invoke',
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        var req = https.request(options, (res) => {
            let jsonString = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                jsonString += chunk;
            });
            res.on('end', () => {
                // console.log(jsonString)
                logs.apiRequests.push({
                    type: "randomOrg-number",
                    request: {
                        "server": req.hostname,
                        "path": req.path,
                        "method": req.method,
                        "header": req.headers
                    },
                    response: {
                        "statusCode": res.statusCode,
                        "statusMessage": res.statusMessage,
                        "data": JSON.parse(jsonString)
                    },
                    responseTime: (new Date()).getTime() - time
                });
                resolve(JSON.parse(jsonString).result.random.data[0]);
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

function getSpotifyToken() {
    let time = (new Date).getTime();
    const spotifyEncodedAuth = JSON.parse(fs.readFileSync('./app_settings.json')).spotifyEncodedKey;
    const data = querystring.stringify({
        grant_type: "client_credentials"
    })

    const options = {
        hostname: 'accounts.spotify.com',
        port: 443,
        path: '/api/token',
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': data.length,
            'Authorization': `Basic ${spotifyEncodedAuth}`
        }
    };

    return new Promise((resolve, reject) => {
        var req = https.request(options, (res) => {
            let jsonString = '';

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                jsonString += chunk;
            });

            res.on('end', () => {
                logs.apiRequests.push({
                    type: "spotify-token",
                    request: {
                        "server": req.hostname,
                        "path": req.path,
                        "method": req.method,
                        "header": req.headers
                    },
                    response: {
                        "statusCode": res.statusCode,
                        "statusMessage": res.statusMessage,
                        "data": JSON.parse(jsonString)
                    },
                    responseTime: (new Date()).getTime() - time
                });
                resolve(JSON.parse(jsonString));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

function getSpotifyPlaylists(token) {
    let time = (new Date()).getTime();
    const options = {
        hostname: 'api.spotify.com',
        port: 443,
        path: '/v1/browse/featured-playlists',
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    };

    return new Promise((resolve, reject) => {

        var req = https.request(options, (res) => {
            let jsonString = '';

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                jsonString += chunk;
            });

            res.on('end', () => {
                logs.apiRequests.push({
                    type: "spotify-playlists",
                    request: {
                        "server": req.hostname,
                        "path": req.path,
                        "method": req.method,
                        "header": req.headers
                    },
                    response: {
                        "statusCode": res.statusCode,
                        "statusMessage": res.statusMessage,
                        "data": JSON.parse(jsonString)
                    },
                    responseTime: (new Date()).getTime() - time
                });
                resolve(JSON.parse(jsonString).playlists.items);
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

function getSpotifyPlaylistTracks(token, playlistId) {
    let time = (new Date()).getTime();
    const options = {
        hostname: 'api.spotify.com',
        port: 443,
        path: `/v1/playlists/${playlistId}/tracks`,
        method: "GET",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    return new Promise((resolve, reject) => {

        var req = https.request(options, (res) => {
            let jsonString = '';

            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                jsonString += chunk;
            });

            res.on('end', () => {
                logs.apiRequests.push({
                    type: "spotify-playlist-tracks",
                    request: {
                        "server": req.hostname,
                        "path": req.path,
                        "method": req.method,
                        "header": req.headers
                    },
                    response: {
                        "statusCode": res.statusCode,
                        "statusMessage": res.statusMessage,
                        "data": JSON.parse(jsonString)
                    },
                    responseTime: (new Date()).getTime() - time
                });
                resolve(JSON.parse(jsonString));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.end();
    });
}

async function getPlaylistInfoAsync() {
    let playlist = {}
    if (token == null) {
        token = await getSpotifyToken();
    }
    let playlists = await getSpotifyPlaylists(token.access_token);
    let randomNumber = await callRandomOrgApi(playlists.length - 1);
    playlist.name = playlists[randomNumber].name;
    let tracks = await getSpotifyPlaylistTracks(token.access_token, playlists[randomNumber].id);
    playlist.tracks = tracks.items.map(song => `${getSongArtists(song.track)} - ${song.track.name}`);
    return playlist
}

function getSongArtists(track) {
    let artists = ''
    for (let artist of track.artists) {
        artists += artist.name + ', ';
    }
    return artists.slice(0, artists.length - 2)
}

function avgResponseTime(requests) {
    let avgResponseTime = requests.map(x => x.responseTime).reduce((a, b) => a + b, 0) / requests.length;
    return avgResponseTime;
}