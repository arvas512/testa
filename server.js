#!/usr/local/bin/node

var http         = require('http');
var https        = require('https');

//var dispatcher   = require('httpdispatcher');
var HttpDispatcher = require('httpdispatcher');
var dispatcher     = new HttpDispatcher(); 


var fs           = require('fs-extra'); 
var qs           = require('querystring');
var request      = require('request'); 
var iconv        = require('iconv-lite');
//var repl        = require('stream-replace');
var cheerio      = require('cheerio');

var events = require('events');
var myEvent  = new events.EventEmitter();

var async        = require('async'); 

var Entities	 = require('html-entities').AllHtmlEntities;
var entities	 = new Entities();



function Vocabulary( args)
{ this.megista_grammata        =  (args && args.megista_grammata)?(+args.megista_grammata):50;
  if( args && args.lexh_regx) this.lexh_regx = args.lexh_regx; 
  else
  { this.elaxista_grammata =  (args && args.elaxista_grammata)?+args.elaxista_grammata:1;
    this.lexh            =  (args.lexh)?args.lexh:'[a-zá-ù]';
    this.lexh_regx   =  new RegExp( this.lexh +'{' +this.elaxista_grammata +',' +this.megista_grammata +'}', 'g'); }
  this.Vocabs            =  []; this.VocabsWords       =  []; 
  for( var i=0; i<this.megista_grammata; this.Vocabs[i]={}, this.VocabsWords[i]=[0, 0], i++);
  this.words             =  0; this.total_founds      =  0; 
  this.sort              =  function()
                            { var words=0, total_founds=0, Vo, Vo_key, keyValues, sum, newVo, len; 
			      for( var jj=0; jj<this.megista_grammata; jj++)
                              { Vo=this.Vocabs[jj], keyValues=[], sum=0, newVo={};
                                for( var key in Vo) 
		                { Vo_key = Vo[ key]; sum += Vo_key; keyValues.push( [ key, Vo_key]); }
                                if( len=keyValues.length) 
                                  keyValues.sort( function( v1, v2) 
		        		          { return (v2[1]>v1[1])?1:(v2[1]<v1[1])?-1:(v1[0]<v2[0])?-1:1;});
                                 // keyValues.sort( function( v1, v2){ return  v2[1]-v1[1]; });
                                this.VocabsWords[jj]=[ len, sum];
				words += len, total_founds += sum;  
                                for( var i=0; i<len; newVo[ keyValues[i][0]] = keyValues[i][1], i++);  
	                        this.Vocabs[jj] = newVo; }
			      this.words=words, this.total_founds=total_founds; }
  this.update            =  function ( data)
                            { var strr, Vos=this.Vocabs, lexh_regx=this.lexh_regx; 
                              while( match = lexh_regx.exec( data))
                              { Vo = Vos[ match[0].length];
                                if( Vo[(strr=match[0])]) Vo[strr] += 1;
                                else                     Vo[strr]  = 1;} 
			      this.sort(); }
  this.print             =  function ( more)
                            { for( var jj=0; jj<this.megista_grammata; jj++)
                                if( this.VocabsWords[jj][0]>0) 
				{ Vos = this.Vocabs[jj]; 
				  console.log( this.VocabsWords[jj][0] +' ' +this.VocabsWords[jj][1]); 
				  for( var key in Vos) 
				    if( Vos[key]>=more) console.log( key + ': ' + Vos[key]); }
			      console.log( 'words=%d total_founds=%d', this.words, this.total_founds); }
  this.Freq              =  function ( word) { return this.Vocabs[ word.length][ word]; } 
  this.inWords           =  function ( word) 
                            { var word_length=word.length, reg_ex= new RegExp( '.*' + word +'.*'); 
			      var Vo, Vokey, result={freq: 0, words: []}, res_words=result.words;
			      for( var jj=word_length; jj<this.megista_grammata; jj++)
			      { Vo=this.Vocabs[jj]; 
			        for( var key in Vo) 
			          if( reg_ex.test( key)) 
			          { result.freq += (Vokey=Vo[key]); 
			            res_words.push([ key, jj, Vokey]); }}
			      return result; } 
  this.inWords1          =  function ( word) 
                            { var word_length=word.length, reg_ex= new RegExp( '.*' + word +'.*'); 
			      var Vo, Vokey, result={freq: 0, words: []}, res_words=result.words;
			      this.Vocabs.slice(word_length)
			          .forEach( function( Vo, jj)
			        	    { for( var key in Vo)
			        		if( reg_ex.test( key)) 
			        		{ result.freq += (Vokey=Vo[key]); 
			        		  res_words.push([ key, jj, Vokey]); }});
			      return result; }  
 if(args && args.data) this.update( args.data); }



var iter=0, i=0, urls=[], urls_length=0, valid_urls=[], valid_urls_length=0, url;
var DelayTime='2.5', SearchNumber='10', WordDist='5', MyScroll=0, TextHtmlListNum=0, Listes=[], ListesNum=0;
var completed, requested, progressMsg=''; 
var completed1, requested1, progressMsg1=''; 

var CheckBoxes={ 'NoPhotos':  false, 'NoMeta':    true,  'Noonload':    true, 'OnlyText': false, 
                 'Nohref':    false, 'NoScript':  true,  'Noitemtype':  true, 'OnlyBody': false,  
		 'NoSrc':     false, 'NoStyles':  false, 'Noaction':	true, 'Source':   false  };  

var DefaultInitCheckBoxes='NoPhotos= NoMeta=t Noonload=t OnlyText= Nohref= NoScript=t Noitemtype=t OnlyBody= NoSrc= NoStyles= Noaction=t Source=', InitCheckBoxes;  
var repl_str1='<span style="display: inline-block; perspective: 10000px"><span class=arvas>',
    repl_str2='</span></span>',  
    finalStyle = '<style>@keyframes blinker { 50% { opacity: .5 ;transform: matrix3d( 1.2, 0, 0, 0,   0, 1.2, 0, 0,    0, 0, 1, 0,    0, 0, 0, 1)  ;  } } .arvas { display: inline-block; transform: matrix3d( 1, 0, 0, 0,   0, 1, 0, 0,    0, 0, 1, 0,    0, 0, 0, 1)  ; color: rgb(0, 0, 0); background-color: rgb(255, 255, 0); opacity: .99 ; animation: blinker 1s ease-in-out infinite; } </style>';

var onDisk='1', ctype="";

var SearchWords, SearchWordsPlus, searchSmallWords; 
var keno, lexh, lexh_regx, elaxista_grammata, megista_grammata, telos_zhtoymenhs_lexhs; 
var SmallWordsEach_regx, SmallWordsEach_regx_len, SmallWords_regx; 
var regexp = /charset[= \t\"\']*([^()<>@,;:\"\'/[\]?.=\s]*)/i ;

function encode_utf8(s) { return unescape(encodeURIComponent(s)); }
function decode_utf8(s) { return decodeURIComponent(escape(s)); }

dispatcher.setStatic('resources');

function OnGetSendFile( str1, arg)
{ dispatcher.onGet( str1, 
                    function(req, res) 
                    { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                      if( arg.file) fs.createReadStream( arg.file).pipe(res);
		      else          res.end( arg.str);        });}

		      
OnGetSendFile( '/',             {file: './pages/index.html'}); 


OnGetSendFile( '/logo-ece.png', {file: './pages/logo-ece.png' }); 

OnGetSendFile( '/mati.png', {file: './pages/mati.png' }); 

OnGetSendFile( '/pageOut',  {file: './pages/out.html'}); 


OnGetSendFile( '/pageOut3', {str:  'about:blank'}); 
dispatcher.onGet( '/pageOut1', 
		  function(req, res) 
		  { if( ListesNum > 0 ) 
		    { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
		    /*if(onDisk) fs.createReadStream( Listes[ MyScroll].htmlsList).pipe(res);
		    else  */	 res.end( Listes[ MyScroll].str1);  
		    /*if(onDisk) fs.createReadStream( Listes[ MyScroll].htmls_List).pipe(res);
		    else       res.end( Listes[ MyScroll].str3);*/  
		       }
		    else res.end('about:blank');   });	


function create_SearchWordsVersions( strs)
{ SearchWords = strs.replace( /[,-]+/g, ' ' ); 
  SearchWordsPlus = SearchWords.replace( /[ ]+/g, '+' );
  var starting_searchSmallWords = convertor2small( SearchWords).match(/[^ ]+/g);
  
  keno       = '0-9,._!?;\s-';
  elaxista_grammata = 2; megista_grammata=50; 
//  lexh = '[^' + keno + ']{' + elaxista_grammata + ',' + megista_grammata + '}'; 
  lexh = '[a-zá-ù]'
  lexh_regx = new RegExp( lexh + '{' + elaxista_grammata + ',' + megista_grammata + '}' , 'g'); 
  
  telos_zhtoymenhs_lexhs = 0; 
  searchSmallWords = [];  
  starting_searchSmallWords.forEach( function( strr, ii) 
  				     { if (telos_zhtoymenhs_lexhs === 0)  searchSmallWords.push( strr);
				       else  searchSmallWords.push( strr.slice( 0, telos_zhtoymenhs_lexhs)); });
  
  SmallWords_regx = new RegExp('(' + searchSmallWords.join('|') + ')', 'g'); 

  SmallWordsEach_regx=[]; 
  searchSmallWords.forEach( function( strr, ii) { SmallWordsEach_regx.push( new RegExp( strr, 'g'));});
  SmallWordsEach_regx_len = SmallWordsEach_regx.length; 
  
  fs.createWriteStream( './pages/SearchWords.txt').write( SearchWords); }


dispatcher.onPost( '/post1', 
                   function( req, res) 
                   { fs.createWriteStream('./pages/out.html' ).end();
		     EmptyDirs(); 
		     create_SearchWordsVersions( req.body); 
		     requested = Math.ceil( parseInt(SearchNumber)/10.0 ), completed=0, progressMsg=""; 
		     valid_urls=[], valid_urls_length=0, completed1=-1; requested1=0;
		     completed1=-1, progressMsg1="";
		     request.head( { url: encode_utf8('https://www.google.com/search?q=' + SearchWordsPlus )},
                                   function( error, ress, body) 
                                   { if( error) 
				     { completed=requested; completed1=0; 
				       return console.log( 'request.head got %s', error);}
			             ddelay=0;
				     var cctype = ress.headers['content-type']; 
		                     var charss = regexp.test( cctype) ? regexp.exec( cctype)[1] : 'utf8'; 
			             console.log('head  ' + charss); 
				     recurs( 0, charss, res); }); }); 
function recurs( i, charss, res)
{ completed=i;
  if( i >= requested) { res.end(); return; }
  url1 = encode_utf8('https://www.google.com/search?q=' + SearchWordsPlus + '&start=' + 10*i + '#q=' +  SearchWordsPlus + '&filter=0' );
  console.log( url1 ); 
  setTimeout( function()
              { const writable1 = fs.createWriteStream('./pages/out.html', {'flags': 'a'});
	        const readable = request.get( { url: url1, encoding: null}).pipe( iconv.decodeStream( charss));
		var buffer = ""; 
		readable.on( 'error', function(err) { completed1=requested1=0; return console.log(err); })
                        .on( 'data',  function(data){ buffer += data.toString(); })
                        .on( 'end',   function()    { /*CollectHtmls( buffer, null);*/ }); 
		readable.pipe( writable1)
		        .on( 'finish', 
		             function(err)
		             { if( err) { completed=requested=0; 
			       return console.log('request.get got %s', err);}
	                       progressMsg = i*10 + ' to ' + (i+1)*10 + ' results written to the file'; 
			       CollectHtmls( buffer, null);
			       recurs( i+1, charss, res); }); },
	      parseFloat( DelayTime) * 1000); }

		       
dispatcher.onPost( '/progress1', 
                   function(req, res) 
                   { res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( ((completed1<0)?'0':(requested1 === 0)?'100':
		                      Math.ceil( 100 * completed1 / requested1 )) + '%, ' + progressMsg1); });

dispatcher.onPost( '/CollectHtmlsEnd', 
                   function(req, res)
                   { console.log( 'send CollectHtmlsEnd'); 
		     res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); 
                     res.end( ListesNum + ' ' );});

dispatcher.onPost( '/CollectHtmlsOnly', 
                   function(req, res)
                   { valid_urls=[], valid_urls_length=0, completed1=-1; 
		     fs.readFile( './pages/out.html', 'utf8', 
                                  function(err, data) 
	                          { requested1=0;
				    if (err) { completed1=0; return console.log( 'No ./pages/out.html file');}
                                    CollectHtmls( data, res); }); });
		       

function getCharSet( obj)
{ var ctype=obj('meta[charset]'); if ( regexp.test( ctype)) return regexp.exec( ctype)[1]; 
  ctype=obj('meta[http-equiv]');  if ( regexp.test( ctype)) return regexp.exec( ctype)[1]; 
  ctype=obj('meta[content]'); return ( regexp.test( ctype)) ? regexp.exec( ctype)[1] : 'utf8'; }



function pad(n) 
{ return (n<10) ? ('000' + n) : (n<100) ? ('00' + n) : (n<1000) ? ('0' + n) : n ; }


function CollectHtmls( htmlsBuffer, res)		       
{ var $ = cheerio.load( htmlsBuffer, {decodeEntities: false}), links = $('.r a'); 
  urls=[];
  links.each( function (i, link) 
              { var url = $(links[i]).attr('href');
                url = url.replace('/url?q=', '').split('&')[0];
                if( url.charAt(0) === '/' ) 
                  return console.log( '-------------Not valid url[ %d] (starts with /) =', i, url);
                var url1 = decodeURIComponent(url), url1s = url1.toLowerCase(); 
                if( url1s.includes( 'pdf') || url1s.includes( '.ppt')  || url1s.includes( 'xls')  ||  
		url1s.includes( '/doc/') ||
              	url1s.includes( '.doc') || url1s.includes( '.aspx') || url1s.includes( '.php')) 
                  return console.log( '-------------Not valid url[ %d] = ', i,  url1); 
                /*var url1_4=url1.slice(-4);
                if( url1_4 ==='.pdf' || url1_4 ==='.ppt') 
                  return console.log( 'Not valid url %d, end's on %s', i,  url1_4);*/
                console.log( 'url[ %d] = ', i,  url1); 
                urls.push( url1); });
  urls_length=urls.length; requested1 += urls_length; progressMsg1="";
  for( let j=valid_urls_length, i=0; i<urls_length; i++, j++)
  { valid_urls.push( urls[i]); 
    myEvent.once( 'HeadStart'+j, 
 		  function( url, ii)
 		  { request.head( { url: url, timeout: 8000 }, 
 				  function(error, ress, body) 
 				  { if( error) 
				    { myEvent.emit( 'End', ii, res); 
     		                      return console.log('ON request.head %d, got %s', ii, error); }
 				    var ctype = ress.headers['content-type']; 
 			            var charset = regexp.test( ctype) ? regexp.exec( ctype)[1] : 'utf8';
				    console.log( 'HeadStart'+i + '    url = ' + url); 
 				    myEvent.emit('HeadReady'+ii , charset, url, ii ); }); }); 
    myEvent.once( 'HeadReady'+j, 
 		  function( charss, url, ii)
 		  { var data, str1, str2, padi= pad(ii),  
     			fileNameG  = './pages/Ghtmls/' + padi + '.html', 
     			fileName   = './pages/htmls/' + padi + '.html', 
     		        commfileName = './pages/comhtmls/' + padi + '.html',  
     			fileName_  = './pages/htmls_/' + padi + '.html'; 
 		    request( { url: url, encoding: null, timeout: 8000 }, 
     			     function (error, response, body) 
     			     { if(error ) 
     			       { myEvent.emit( 'End', ii, res);  
     	                         return console.log( "Couldn't get page %d because of %s", ii, error);}
			       if( body.length===0  || body.length > 3500000)
			       { myEvent.emit( 'End', ii, res);  
                                 return console.log( "Couldn't proccess page %d because length = %d", 
				                                                    ii,  body.length); }
			       var $ = cheerio.load( body, {decodeEntities: false});
                               if( charss=='utf8' || charss=='UTF-8' ||
			           charss=='UTF8' || charss=='utf-8'   ) charss=getCharSet($); 
                            //   if( charss==='UTF-85') 
			   //  data = he.decode( body.toString().replace( />/g,  '> ').replace( charss, 'utf-8'));
		//data = entities.decode( body.toString().replace( />/g,  '> ').replace( charss, 'utf-8'));
                          //     else 
    		             //  fs.createWriteStream( fileNameG).write( body); 
    		               data = entities.decode(iconv.decode( body, charss).replace( />/g,  '> ').replace( charss, 'utf-8'));
//		               data =  entities.decode( data);
                                 
                               console.log( '---------chars= ' + charss + ' ' + fileName + ' data.length= ' +
			                    data.length + ' ListesNum= ' + ListesNum + ' ii= ' + ii + 
					    '\n ---------url = ' + url );
						   
			       Listes.push( { ii:         ii,
					      charset:    charss,  
					      url:	  url, 
					      GhtmlsList: fileNameG, 
					      htmlsList:  fileName,
					      comList:    commfileName,
					      htmls_List: fileName_, 
					      vocabulary: new Vocabulary( { megista_grammata: megista_grammata,
					                                    lexh_regx: lexh_regx, 
									    data: data})     }); 
				
//			       console.log( 'perase1'); 
			       Listes[ ListesNum].phrases = VresPhrases( data); 
//			       console.log( 'perase1 VresPhrases'); 
			       str2 =  dataSmall( data, Listes[ ListesNum].phrases);
//			       console.log( 'perase1 dataSmall'); 
			       Listes[ ListesNum].lexeis = VresLexeis( str2, Listes[ ListesNum].phrases);
//			       console.log( 'perase1 VresLexeis'); 
			       Listes[ ListesNum].str3 = ValeLexeis( data, Listes[ ListesNum].lexeis);
//			       console.log( 'perase1 ValeLexeis'); 
			       
//			       console.log( 'perase2'); 
			       
                               str1 = filter( Listes[ ListesNum].str3); 
			       Listes[ ListesNum].str1 = str1;
			       Listes[ ListesNum].str2 = str2; 
			         
//                               console.log( 'perase3'); 

			       if(onDisk)
			       { fs.createWriteStream( fileNameG).write( data); 
                                 fs.createWriteStream( fileName ).write( str1); 
  	  		         fs.createWriteStream( commfileName).write( str2);
				 fs.createWriteStream( fileName_).write( Listes[ ListesNum].str3);
			         /*VresValeLexeis( ListesNum, str1, str2);*/ }
			       ListesNum += 1;
			       myEvent.emit( 'End', ii, res); }); }); }
  for( let total_length=valid_urls.length, j=valid_urls_length; j<total_length; j++)
    myEvent.emit('HeadStart'+j , valid_urls[j], j ); 
  valid_urls_length = valid_urls.length;  }


myEvent.on( 'End', 
	    function( ii, res)
	    { myEvent.removeAllListeners( 'HeadReady' + ii); 
	      console.log( 'End Event ' + ii); 
	      if( myEvent.eventNames().length == 1)
	      { Listes.sort( function(a, b){ return a.ii - b.ii;});
                if(res)
		{ res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}); 
                  res.end( ListesNum + ' ' );}}
	      else completed1++, progressMsg1=valid_urls[ii]; });  



function VresPhrases( data) 
{ var regex1 = />[\s]*(?:[^<\s]+[\s]*)+\<./gim, match, phrases = [ [0, 0]];
  while( match = regex1.exec( data))
    { phrases.push( [ regex1.lastIndex-match[0].length+1, regex1.lastIndex-2] );
      /*console.log('match');
      console.log(match);*/  }
  var w_leng = phrases.length, deletedMs=[]; 
  
//  console.log("Perase1 VresPhrases 1"); 
  
  for( var jj=1, kk=0; jj<w_leng; jj++)
    if( // str1.substr( phrases[jj][1], 2) !== '</' ||
        data.substr( phrases[jj][1], 7) === '</style' ) deletedMs.push( jj-kk++);
	 
//  console.log("Perase1 VresPhrases 2"); 
  
  deletedMs.forEach( function( item, index) { phrases.splice( item, 1); }); 
  return phrases; }


function dataSmall( data, phrases) 
{ var w_leng = phrases.length, strss=""; 
  for( var jj=1; jj<w_leng; jj++)
    strss += data.substring( phrases[jj-1][1], phrases[jj][0]) + 
             convertor2small( data.substring( phrases[jj][0], phrases[jj][1]));
  return strss + data.substring( phrases[jj-1][1], data.length); } 


function VresLexeis( data, phrases) 
{ var  w_leng = phrases.length, match, lexeis = [ [0, 0]], jj;
  for( jj=1; jj<w_leng; jj++)
  { var ind = phrases[jj][0], str=data.substring( ind, phrases[jj][1]);
    while( match = SmallWords_regx.exec( str))
      lexeis.push( [ ind + SmallWords_regx.lastIndex-match[0].length, ind + SmallWords_regx.lastIndex]); }
  return lexeis; }


//function VresLexeis( data, phrases) 
//{ var  w_leng = phrases.length, match, lexeis = [ [0, 0]];
//  for( var jj=1; jj<w_leng; jj++)
//  { var ind = phrases[jj][0], str=data.substring( ind, phrases[jj][1]);
//    while( match = lexh_regx.exec( str))
//    { 
//     
//     }
//    /*while( match = SmallWords_regx.exec( str))
//	lexeis.push( [ ind + SmallWords_regx.lastIndex-match[0].length, ind + SmallWords_regx.lastIndex]);*/ }
//  return lexeis; }


function ValeLexeis( data, lexeis) 
{ var sstr = "", w1_leng=lexeis.length;
  for( var jj=1; jj<w1_leng; jj++)    
  /*{ sstr += data.substring( lexeis[jj-1][1], lexeis[jj][0]) + repl_str1 + 
  	    data.substring( lexeis[jj  ][0], lexeis[jj][1]) + repl_str2 ; }*/
  { sstr += data.substring( lexeis[jj-1][1], lexeis[jj][0]) + ' arvas333 ' + 
  	    data.substring( lexeis[jj  ][0], lexeis[jj][1]) + ' arvas332 ' ; }
//  return sstr + data.substring( lexeis[jj-1][1], data.length).replace(/<\/body>/, finalStyle+'</body>'); 
  return sstr + data.substring( lexeis[jj-1][1], data.length); }




dispatcher.onPost( "/DelayTime", 
                   function(req, res)
                   { console.log( '************ dispatcher.onPost "/DelayTime" *************');
		     DelayTime = req.body;  
		     res.end(); });


dispatcher.onPost( '/IdentityFromPage', 
                   function(req, res) 
                   { var arg = { file: 'pages/PageSeven.html'}; 
		     console.log( 'MPHKE  ' +  req.body);
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
                     fs.createReadStream(  'pages/PageSeven.html').pipe(res);  });



dispatcher.onPost( '/progress', 
                   function(req, res) 
                   { res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( ((completed<0)?'0':(requested === 0)?'100': Math.ceil( 100 * completed / requested )) +
		     '%, ' + progressMsg); });
		     		     
dispatcher.onPost( '/SearchNumber', 
                   function(req, res) 
                   { SearchNumber  = req.body; 
                     res.end(); });

dispatcher.onPost( '/DelayTime', 
                   function(req, res)
                   { DelayTime = req.body;  
		     res.end(); });

dispatcher.onPost( '/myScroll', 
                   function(req, res)
                   { MyScroll = parseInt( req.body, 10); 
		     strs=(ListesNum>0)? (Listes[ MyScroll].url) : "" ; 
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( strs); });


function convertor2small(str)
{ //console.log( str )
  return str.replace( /[ABCDEFGHIGKLMNOPQRSTUVWXYZÁ¶ÂÃÄÅ¸ÆÇ¹ÈÉºÚÊËÌÍÎÏ¼ÐÑÓÔÕ¾ÛÖ×ØÙ¿ÜÝÞßúÀüýûàþò]/g, function (m) 
       { //console.log( '************************************' + m); 
         return { 'A':'a', 'B':'b', 'C':'c', 'D':'d', 'E':'e', 'F':'f', 'G':'g', 'H':'h', 
	 	  'I':'i', 'J':'j', 'K':'k', 'L':'l', 'M':'m', 'N':'n', 'O':'o', 'P':'p', 
	 	  'Q':'q', 'R':'r', 'S':'s', 'T':'t', 'U':'u', 'V':'v', 'W':'w', 'X':'x', 
	 	  'Y':'y', 'Z':'z', 
	 	  'Á':'á', '¶':'á', 'Â':'â', 'Ã':'ã', 'Ä':'ä', 'Å':'å', '¸':'å',
	 	  'Æ':'æ', 'Ç':'ç', '¹':'ç', 'È':'è', 'É':'é', 'º':'é', 'Ú':'é',
	 	  'Ê':'ê', 'Ë':'ë', 'Ì':'ì', 'Í':'í', 'Î':'î', 'Ï':'ï', '¼':'ï',
	 	  'Ð':'ð', 'Ñ':'ñ', 'Ó':'ó', 'Ô':'ô', 'Õ':'õ', '¾':'õ', 'Û':'õ',
	 	  'Ö':'ö', '×':'÷', 'Ø':'ø', 'Ù':'ù', '¿':'ù', 
	 	  'Ü':'á', 'Ý':'å', 'Þ':'ç', 'ß':'é', 'ú':'é', 'À':'é', 
         	  'ü':'ï', 'ý':'õ', 'û':'õ', 'à':'õ', 'þ':'ù', 'ò':'ó', }[m]; }); }
		  

dispatcher.onPost( '/WordDist',  
                   function(req, res)
                   { WordDist = req.body;  
		     console.log( searchSmallWords); 
		     var str, str1, str2; 
		     console.log( 'WordDist=%s', WordDist); 
		     
		     if(onDisk)  
		       for( var i=0; i<ListesNum; i++)
		       { var file=Listes[i].comList; 
		         console.log( 'Listes[%d].comList=%s  Listes[%d].ii=%d', i, file, i, Listes[i].ii); 
		         str1 = fs.readFileSync( file).toString(); 
		         str2 = str1.replace( SmallWords_regx, function(m) { return repl_str1 + m + repl_str2; }); 
		         fs.createWriteStream( file).write( str2); } 
		     else for( var i=0; i<ListesNum; i++)
                            Listes[i].str2 = Listes[i].str2.replace( SmallWords_regx, 
			                                             function(m) 
								     { return repl_str1 + m + repl_str2; });
		     strs = (ListesNum>0)? (Listes[ MyScroll].url) : "" ;
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( strs); });


dispatcher.onPost( '/DelContent1', 
                   function(req, res)
                   { fs.createWriteStream('./pages/out.html' ).end();
		     res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'}  );
                     res.end(); });

dispatcher.onPost( '/DelContent2', 
                   function(req, res)
                   { EmptyDirs(); 
		     res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'} ); 
		     res.end(); });

dispatcher.onPost( '/SaveFilters', 
                   function(req, res)
                   { InitCheckBoxes=CheckBoxesToString(); 
		     fs.createWriteStream( './pages/InitialFilters.txt').write(InitCheckBoxes); }); 

dispatcher.onPost( '/InitialFilters', 
                   function(req, res)
                   { InitCheckBoxes=DefaultInitCheckBoxes;
		     CheckBoxes = qs.parse( InitCheckBoxes, ' '); 
		    // completed=0, requested=ListesNum, progressMsg="";
		     respFunc( res,  InitCheckBoxes); });

dispatcher.onPost( '/CheckBoxes', 
                   function(req, res)
                   { CheckBoxes = qs.parse( req.body, ' ');
		  //   completed=0, requested=ListesNum, progressMsg="";
		     respFunc( res, ''); }); 

function respFunc( res, resEnd)
{ async.forEachOf( Listes,
  		   function( item, jj, callback)
  		   { completed=jj; 
		     var fileNameG = item.GhtmlsList, 
     		         fileName  = item.htmlsList, 
			 commfileName  = item.comList, 
			 fileName_   = item.htmls_List;
	             
		     var str1 = filter( Listes[ jj].str3); 
		     Listes[ jj].str1 = str1; 
		     if(onDisk)
		     { fs.createWriteStream( fileName).write( str1); } 
     		     /*if(onDisk)
		     { var str1 = filter( fs.readFileSync( fileName_));
		       fs.createWriteStream( fileName).write( str1); }
		     else
		     { Listes[ jj].str1 = filter( Listes[ jj].str3);}*/
		     callback(); },
  		   function(err)
  		   { completed=requested; 
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( resEnd);          }); } 


function filter( strr)
{ $ = cheerio.load( strr, {decodeEntities: false}); 
  if( CheckBoxes['NoPhotos'])  
  { $('img').removeAttr('src'); $('img').removeAttr('href'); 
    $(':image').removeAttr('href'); $(['style="background-image"']).removeAttr('href'); 
    /*$('*[background*="/"]').removeAttr(['background']);*/ }
  if( CheckBoxes['NoSrc'])    { $('*').removeAttr('src'); $('*').removeAttr('srcset');}
  if( CheckBoxes['NoMeta'])   $('meta').remove();
  if( CheckBoxes['NoStyles']) { $('style').remove(); $('*').removeAttr('style');}
  if( CheckBoxes['NoScript']) $('script').remove();
  if( CheckBoxes['Nohref'])   $('*').removeAttr('href');
  if( CheckBoxes['Noonload']) { $('*').removeAttr('onload'); $('link').remove(); 
                                $('*').removeAttr('xmlns');  $('*').removeAttr('data-src'); 
				$('input').remove();/*  $('*').removeAttr('onsubmit'); */}  
  if( CheckBoxes['Noitemtype']) $('*').removeAttr('itemtype');   
  if( CheckBoxes['Noaction']) $('*').removeAttr('action');
  var str1;
/*  if( CheckBoxes['OnlyText'])  str1 = '<!DOCTYPE><html><body>' + $('*').text() + '</body> </html>'; 
  else                         str1=$.html();*/
  if( CheckBoxes['OnlyText'])  str1 = '<!DOCTYPE><html><body>' + $('*').text() + finalStyle + '</body> </html>'; 
  else                         { $('body').append( finalStyle); str1=$.html(); }
  str1 = str1.replace( / arvas333 | arvas332 /g, function(m)
                                                 { return { ' arvas333 ': repl_str1, 
                                                            ' arvas332 ': repl_str2  }[m] });
							    
/*  var rePattern = new RegExp( '( arvas333 | arvas332 )', 'g' );
  while( match = rePattern.exec( str1))
    phrases.push( [ rePattern.lastIndex-match[0].length, rePattern.lastIndex] );*/

							     
  return str1; }


function CheckBoxesToString()
{ var strs=""; 
  for( var i in CheckBoxes) strs += i + '=' + ((CheckBoxes[i])?'t':'') + ' ';
  return strs; }

dispatcher.onPost( '/Initials', 
                   function(req, res)
                   { var strs= SearchNumber + ' ' + DelayTime + ' ' + WordDist + 
		                                     ' ' + ListesNum + ' ' + InitCheckBoxes;
		     CheckBoxes = qs.parse( InitCheckBoxes, ' '); 
		     res.writeHead( 200, {'Content-Type': 'text/html; charset=utf-8'});
		     res.end( strs); });

function EmptyDirs()
{ fs.emptyDir('./pages/Ghtmls', function (err)    { if (!err) console.log('Created empty Ghtmls dir!');   });
  fs.emptyDir('./pages/htmls', function (err)     { if (!err) console.log('Created empty htmls dir!');    });
  fs.emptyDir('./pages/comhtmls/', function (err) { if (!err) console.log('Created empty comhtmls dir!'); });
  fs.emptyDir('./pages/htmls_/', function (err)   { if (!err) console.log('Created empty htmls_ dir!');   });
  MyScroll=0, ListesNum=0, Listes=[]; }


function setInitCheckBoxes()
{ fs.readFile( './pages/InitialFilters.txt', 'utf8', 
               function(err, data) 
	       { if (err) 
	         { InitCheckBoxes=DefaultInitCheckBoxes; 
	           return console.log( 'No initial Filters file'); }
                 InitCheckBoxes=data; }); }



//fs.createWriteStream('./pages/out.html' ).end();
EmptyDirs(); 
const PORT=3000; 
fs.readFile( './pages/InitialValues.txt', 'utf8', 
             function(err, data) 
	     { if (err) return console.log( 'No InitialValues.txt file: ' + err);
               var vals=data.split(' ');
	       SearchNumber=vals[0]; DelayTime=vals[1]; WordDist=vals[2]; 
	       /*create_SearchWordsVersions( vals.slice( 3)); */ });
fs.readFile( './pages/SearchWords.txt', 'utf8', 
             function(err, data) 
	     { if (err) return console.log( 'No SearchWords.txt file: ' + err);
               create_SearchWordsVersions( data);
	       console.log( 'SearchWords= ' + SearchWords); });

setInitCheckBoxes(); 




function handleRequest(request, response)
{ try 
  { if( request.url !== '/progress' && request.url !== '/progress1') console.log('Got a request ' + request.url);
    if (request != undefined ) dispatcher.dispatch(request, response); } 
  catch(err) 
  { console.log(err); }}

var server = http.createServer(handleRequest); 
server.listen( PORT, '127.0.0.1', 
               function(){ console.log('Server listening on: http://localhost:%s', PORT); });


