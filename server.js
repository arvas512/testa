let http = require('http');
let fs = require('fs');

 
let SF = ( resp, fil) => 
{ fs.readFile( fil, null, function (error, data) 
  { if (error) { resp.writeHead(404); resp.write('Whoops! File not found!'); } 
    else       { resp.write(data); }
    resp.end(); }); }

 
let handleRequest = (req, resp) => { 
//  console.log('Got a request ' + req.url);
  resp.writeHead(200, { 'Content-Type': 'text/html' });
       if ( req.url==='/')	    SF( resp, './pages/index.html')
  else if ( req.url==='/mati.png')  SF( resp, './pages/mati.png'  )
};
 
http.createServer( handleRequest).listen(8080);
