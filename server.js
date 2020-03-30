let http = require('http');
/*let fs = require('fs');*/
let fs = require('fs-extra'); 

 
let SF = ( resp,  fil) => 
{ fs.readFile( fil, function (error, data) 
  { if (error) { resp.writeHead(404); resp.write('Whoops! File not found!'); } 
    else       { resp.write(data); }
    resp.end(); }); }

 
let handleRequest = (req, resp) => { 
//  console.log('Got a request ' + req.url);
  resp.writeHead(200, { 'Content-Type': 'text/html' });
       if ( req.url==='/')	    SF( resp, './pages/index.html')
  else if ( req.url==='/mati.jpg')  SF( resp, './pages/mati.jpg'  )
};
 
http.createServer( handleRequest).listen(8080);
