'use strict';
// Prévia visual local: serve apenas os assets públicos e os dados fictícios.
const express=require('express'),path=require('node:path');
const root=path.resolve(__dirname,'..'),app=express();
app.disable('x-powered-by');
app.get('/',(_req,res)=>res.redirect('/app/preview.html#/dashboard'));
for(const dir of ['app','design-system'])app.use('/'+dir,express.static(path.join(root,dir),{dotfiles:'deny',maxAge:0}));
app.use((_req,res)=>res.sendStatus(404));
app.listen(3002,'127.0.0.1',()=>console.log('Prévia visual: http://127.0.0.1:3002/app/preview.html#/dashboard'));
