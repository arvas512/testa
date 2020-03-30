let http = require('http');

let fs = require('fs-extra'); 
let HttpDispatcher = require('httpdispatcher');
let dispatcher     = new HttpDispatcher(); 

dispatcher.setStatic('resources');
 
function OnGetSendFile( str1, arg)
{ dispatcher.onGet( str1, 
                    function(req, res) 
                    { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                      if( arg.file) fs.createReadStream( arg.file).pipe(res);
		      else          res.end( arg.str);        });}

OnGetSendFile( '/',         {file: './pages/index.html'}); 
OnGetSendFile( '/mati.jpg', {file: './pages/mati.jpg' }); 

dispatcher.onPost( '/IdentityFromPage', 
                   function(req, res) 
                   { var arg = { file: 'pages/PageSeven.html'}; 
		     console.log( 'MPHKE  ' +  req.body);
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
                     fs.createReadStream(  'pages/PageSeven.html').pipe(res);  });


function handleRequest(req, res)
{ try 
  { if (req != undefined ) dispatcher.dispatch( req, res); } 
  catch(err) 
  { console.log(err); }}

const PORT=8080; 
var server = http.createServer( handleRequest); 
server.listen( PORT, function(){ console.log('Server listening on: http://localhost:%s', PORT); });
//server.listen( PORT); 
	       






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
