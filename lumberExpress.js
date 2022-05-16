//* Application allows searching a directory on localhost and parsing/filtering
//* Express and Node are used
//* Two POST routes are used:
//* 1) /fileList allows searching directory
//* 2) /fileContents allows parsing and searching the contents of particular file

const express = require('express'); //ended us using express since uWebsocket implementation required newer CentOS or newer GlibC 
const app = express();
const fs = require("fs").promises; //promises FTW
const path = require("path"); // find path in case needed
const cors = require('cors') //allows accessing server using fetch if necessary
var ip = require('ip'); //easiest implementation of getting IP
let port = 8082
let res = []
let parsedFileContents = []
let serverIp = ip.address()
let appName =  `Lumberjill`
let version =  `0.1`
console.log (`appName:${appName} version:${version} hosted at:${serverIp}:${port}`) //list the app and version on startup


//&init server//
app.use(cors()) //for accessing server using fetch
app.listen(port)
app.use(express.json());


//* server REST handling//
//* 1) /fileList allows searching directory//
app.post('/fileList', (req, response) => {
    //& express get url
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const hostUrl = `${protocol}://${host}:${port}`
    console.log("request made to server from:", req.ip)
    console.log(__dirname);
    async function getDirectory() {
        try {
            let body = await req.body
            let searchDirectory = await body.searchDirectory
            console.log('@debug body is',body)
            res = []
            const files = await fs.readdir(`${searchDirectory}`, 'utf8');
            for (let file of files) {
                const extension = path.extname(file);
                const fileStat = await fs.stat(searchDirectory + "/" + file);
                res = [...res, { name: file, extension: extension, size: fileStat.size, cdtm: fileStat.birthtime, mdtm: fileStat.mtime, serverIp, hostUrl }];
                }
            //& pre-sorts based on modified dtm before sending &//
            res.sort(function(x, y){
                    date1 = new Date(x.mdtm);
                    date2 = new Date(y.mdtm);
                    return date2 - date1;
                })
            response.setHeader('Content-Type', 'application/json');
            response.send({results: res}); //*Express type return
            } catch (error) {
                console.log(error)
                response.send(error)
            }
    }
    getDirectory()
 
})

//* 2) /fileContents allows parsing and searching the contents of particular file
app.post('/fileContents', (req, response) => {
    //& express get url
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const fullUrl = `${protocol}://${host}:${port}`
    //& todo add in other parts//
    console.log("request made to server from:", req.ip)
    console.log(__dirname);
    async function getDirectory() {
        try {
            let body = await req.body
            let searchDirectory = await body.searchDirectory
            let searchFilter = await body.searchFilter
            let fileName = body.fileName
            console.log('query for file is:', `${searchDirectory}/${fileName}`)
            res = []
            const fileContents = await fs.readFile(`${searchDirectory}/${fileName}`, 'utf8');
            parsedFileContents = fileContents.split(/\r?\n/)
            const countParsed = parsedFileContents.length
            const filteredFileContents = parsedFileContents.filter((x) => x.includes(searchFilter));
            filteredFileContents.sort(function(x, y){
                date1 = new Date(x.mtime);
                date2 = new Date(y.mtime);
                return date1 - date2 ;
            })
            const countFiltered = filteredFileContents.length
            console.log('fileContents:', fileContents)
            response.setHeader('Content-Type', 'application/json');
            response.send({response:{countFiltered: countFiltered, countParsed: countParsed, result: filteredFileContents}});
            //res.end
            } catch (error) {
                console.log(error)
                response.send(error)
            }
    }
    getDirectory()
})

