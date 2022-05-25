//* Application allows searching a directory on localhost and parsing/filtering
//* Hyper-express and Node are used
//* Two POST routes are used:
//* 1) /fileList allows searching directory
//* 2) /fileContents allows parsing and searching the contents of particular file
//* this uses streams and pipes to more efficiently filter data and send
//* Hyper-express uses uWebsockets which requires newer versions of libc, so may not work on older OS such as CentOS 7

import fsp from 'node:fs/promises'
import fs from 'fs';
import { open} from 'node:fs/promises';
import { Transform } from 'stream';
import { Readable } from 'node:stream';
import {WritableStream} from 'node:stream/web';
import Stream from 'stream'
import HyperExpress from 'hyper-express'
import cors from 'cors'
import path from 'path'
import ip from 'ip'
import fsb from 'fs-backwards-stream'
const Server = new HyperExpress.Server();
const port = 8082
let res
let serverIp = ip.address()
let date1, date2
let filteredContents = []
let filteredContentsResponse = []

Server.use(cors())
Server.options('/fileList', (request, response) => {
    return response.header('Access-Control-Allow-Origin', '*').header('Access-Control-Allow-Headers', 'Content-Type, X-My-Header-Here')
})
Server.options('/fileContents', (request, response) => {
    return response.header('Access-Control-Allow-Origin', '*').header('Access-Control-Allow-Headers', 'Content-Type, X-My-Header-Here')
})
Server.listen(port)
.then((socket) => console.log('Webserver started on port 8082'))
.catch((error) => console.log('Failed to start webserver on port 8082'));

//call to parse file contents
Server.post('/fileContents', async (request, response) => {
    console.log('hyper fileContents')
        try {
            let body = await request.json();
            let searchDirectory = body.searchDirectory
            let searchFilter = body.searchFilter
            let fileName = body.fileName
            let pageNumber = body.pageNumber
            console.log('${searchDirectory}/${fileName} before is:',`${searchDirectory}/${fileName}`)
            console.log('body is:',body)
            const stats = await fsp.stat(`${searchDirectory}/${fileName}`)
            const chunkSize = 16383 //standard chunk size
            const fileSizeThreshold = 411451160 //411mb
            const chunkCount = Math.ceil(stats.size/chunkSize) //eg 19200 for 300mb file
            const chunksReturned = Math.ceil(chunkCount/2) //this is intended to enable pagination by chunks and is half of total chunks, not implemented yet
            let readStart
            const readEnd = stats.size
            //&if file greater than certain threshold, then paginate for infinite scroll
            stats.size > fileSizeThreshold ? (readStart = ((chunkCount - chunksReturned) * chunkSize),console.log(`File larger than ${fileSizeThreshold}`)) : readStart = 0
            const file = `${searchDirectory}/${fileName}`
            const filePath = `${searchDirectory}/${fileName}`

            const readStream = fsb(file, {block:chunkSize, start:readEnd, end:readStart}) //reads in reverse
            console.log('Size of file:',stats.size,'totalChunkCount:',chunkCount,'readStart:',readStart,'chunksReturned:',chunksReturned, 'pageNumber:', pageNumber)
            //const reversedDataFilePath = filePath.split('.')[0] + '-reversed.'+ filePath.split('.')[1]; //extra code if want to create a file
            //const writeStream = fs.createWriteStream(reversedDataFilePath); //extra code if want to create a file
            
              function reverse(filePath) {
                let cnt = 0 //value to track chunks
                const reverseLineStream = new Transform({
                    transform (chunk, encoding, next) {
                        const reversedChunk = (chunk.toString().split('\n').filter((logContents) => logContents.includes(searchFilter))).reverse().join('\n');
                        let totalCount = reversedChunk.length
                        cnt++
                        let chunkDelimiter = 'chunkDelimiter:LJ' + cnt
                        //if (reversedChunk.includes(searchFilter)){ //if you wanted to filter entire chunks
                            this.push(chunkDelimiter + ' ' + reversedChunk);
                            //this.push({reversedChunk});
                        //}
                        next();
                    }
                });
                readStream.pipe(reverseLineStream).pipe(response).on('finish', () => {
                    console.log(`Finished reversing the contents of ${filePath} and piping the output to the response.`);
                });
                
            }
            reverse(file)
            } catch (error) {
            console.log(error)
            response.json(error)
            }
})

//gets the list of files
Server.post('/fileList', (req, response) => {
    console.log('hyper fileList')
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const hostUrl = `${protocol}://${host}:${port}`
    console.log("request made to server from:", req.ip)
    async function getDirectory() {
        try {
            let body = await req.json()
            let searchDirectory = await body.searchDirectory
            searchDirectory = `/var/log`
            res = []
            const files = await fsp.readdir(`${searchDirectory}`, 'utf8');
            console.log('request body is',body)
            for (let file of files) {
                const extension = path.extname(file);
                const fileStat = await fsp.stat(searchDirectory + "/" + file);
                res = [...res, { name: file, extension: extension, size: fileStat.size, cdtm: fileStat.birthtime, mdtm: fileStat.mtime, serverIp, hostUrl }];
                }
            //& pre-sorts based on modified dtm before sending//
            res.sort(function(x, y){
                    date1 = new Date(x.mdtm);
                    date2 = new Date(y.mdtm);
                    return date2 - date1;
                })
            response.setHeader('Content-Type', 'application/json');
            response.json({results: res});
            } catch (error) {
                console.log(error)
                response.json(error)
            }
    }
    getDirectory()
})