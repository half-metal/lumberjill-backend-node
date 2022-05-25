# lumberjill-backend-node
More info which describes how this node agent can be used with frontend:
https://github.com/half-metal/frontend-sveltekit-lumberjill/blob/master/README.md


If you want to use in standalone mode, can use query params in the URL such as this
http://localhost:3060/logs/test2.log?searchDirectory=/var/log&agent=http://10.11.12.13:8082&searchFilter=INFO
It is case sensitive

Start the file as usual with node, npx, nodemon, pm2, depending what your goal is
```nodemon hyperStream.js```

Now you can search list of log files and log contents with REST calls

POST /fileList will return a list of log files in specified directory
```
POST /fileList
Host: localhost:8082
Accept: application/json
Content-Type: application/json
{
    "searchDirectory" : "/var/log"
    }
```
    
POST /fileContents will return the contents of specified file in desc order in specified directory
```
POST /fileContents 
Host: localhost:8082
Accept: application/json
Content-Type: application/json
Content-Length: 104
{
    "fileName":"test6.log", "searchDirectory" : "/var/log", "searchFilter":"SyncMethodHandler"
    }
```

*PARAMETERS

fileName:name of file

searchDirectory:directory which is used by both /fileList and /fileContents

searchFilter:filter used to only return lines with specific search terms


*This uses hyper-express which is built on uWebsockets, meaning older OS may not be compatible such as CentOS 7

