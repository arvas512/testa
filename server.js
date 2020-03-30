let http = require('http');
/*let fs = require('fs');*/
let fs = require('fs-extra'); 
let HttpDispatcher = require('httpdispatcher');
let dispatcher     = new HttpDispatcher(); 

dispatcher.setStaticDirname('static');
dispatcher.setStatic('/resources');
    
/*dispatcher.setStaticDirname('.');
dispatcher.setStatic('resources');*/
 
function OnGetSendFile( str1, arg)
{ dispatcher.onGet( str1, 
                    function(req, res) 
                    { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                      if( arg.file) fs.createReadStream( arg.file).pipe(res);
		      else          res.end( arg.str);        });}


OnGetSendFile( '/',         {file: './pages/index.html'}); 
OnGetSendFile( '/mati.jpg', {file: './pages/mati.jpg' }); 

function handleRequest(request, response)
{ try 
  { if( request.url !== '/progress' && request.url !== '/progress1') console.log('Got a request ' + request.url);
    if (request != undefined ) dispatcher.dispatch(request, response); } 
  catch(err) 
  { console.log(err); }}

var server = http.createServer(handleRequest); 

const PORT=8080; 
server.listen( PORT, '127.0.0.1', 
               function(){ console.log('Server listening on: http://localhost:%s', PORT); });






/*let SF = ( resp,  fil) => 
{ fs.readFile( fil, function (error, data) 
  { if (error) { resp.writeHead(404); resp.write('Whoops! File not found!'); } 
    else       { resp.write(data); }
    resp.end(); }); }

 
let handleRequest = (req, resp) => { 
  resp.writeHead(200, { 'Content-Type': 'text/html' });
       if ( req.url==='/')	    SF( resp, './pages/index.html')
  else if ( req.url==='/mati.jpg')  SF( resp, './pages/mati.jpg'  )
};
 
http.createServer( handleRequest).listen(8080);*/
