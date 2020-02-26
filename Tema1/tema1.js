let https = require("https")
let http = require('http');
let fs = require('fs');
let querystring = require('querystring');
let handlebars = require("handlebars")

let token = null;
let logs = [];

let server = http.createServer(async (request, response) => {
    switch (request.url) {
        case '/': {
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });

            let data = await getPlaylistInfoAsync();

            let content = fs.readFileSync("./Views/index.hbs");
            let template = handlebars.compile(content.toString());
            let output = template(data);

            response.end(output);
            break;
        }
        case "/api/callApis": {
            response.writeHead(200, {
                'Content-Type': 'application/json'
            });

            let data = await getPlaylistInfoAsync();
            response.end(JSON.stringify(data));
            break;
        }
        default: {
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });

            response.end("404");
            break;
        }
    }
});

server.listen(8080);


function callRandomOrgApi(maxNumber) {
    const randomOrgApiKey = JSON.parse(fs.readFileSync('./app_settings.json')).randomOrgApiKey;

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
                logs.push({
                    request: req,
                    response: res
                })
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
                logs.push({
                    request: req,
                    response: res
                })
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
                logs.push({
                    request: req,
                    response: res
                })
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
    if (token == null)
        token = await getSpotifyToken();
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
