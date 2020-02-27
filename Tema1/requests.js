let http = require("http");

let logs = [];

function send50Requests(iteration, totalNrOfRequests) {
    if (50 * iteration >= totalNrOfRequests) {
        console.log(logs)
        return;
    }
    
    for (let i = 0; i < 50; i++)
        http.get("http://localhost:8081/api/callApis", res => {
            const { statusCode } = res;
            let time = (new Date()).getTime();

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    logs.push({
                        data: parsedData,
                        statusCode: statusCode,
                        responseTime: (new Date()).getTime() - time,
                        time: new Date()
                    });
                } catch (e) {
                    console.error(e.message);
            }
            });
        }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
        });
    
    setTimeout(send50Requests, 3000, iteration+1, totalNrOfRequests);
}

send50Requests(0, 100);
