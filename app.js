const http = require("http");
const dotenv = require("dotenv");
const fs = require("fs");

// au début du fichier
dotenv.config();

const server = http.createServer((request, response)=>{
    if(request.method == "GET" && request.url == "/") 
    {
        const file = fs.readFileSync('./public/index.html', 'utf-8');
        response.setHeader("Content-Type", "text-html");
        response.statusCode = 200;
        response.end(file);
    }
    else
    {
        const file = fs.readFileSync('./public/404.html', 'utf-8');
        response.setHeader("Content-Type", "text-html");
        response.statusCode = 404;
        response.end(file);
    }
})

server.listen(process.env.PORT, ()=>{
    console.log("Le serveur a démarré.");
});
