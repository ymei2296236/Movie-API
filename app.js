const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const mustacheExpress = require("mustache-express");
const db = require("./config/db.js");
const { ServerResponse } = require("http");

/**
 *  Configurationau - début du fichier
*/      
dotenv.config();    
const server = express();

// Définir le path du dossir de views
server.set("views", path.join(__dirname, "views"));
server.set("view engine", "mustache");
server.engine("mustache", mustacheExpress());


/**
 *  Middleware 
*/   
server.use(express.static(path.join(__dirname, "public")));

//Permet d'accepter des bodys en Json dans les requêtes
server.use(express.json());


/**
 * Points d'accès
 */

/**
 * @method GET
 * Permet d'accéder à tous les films
 */
server.get("/films", async (req, res)=>
{
    try
    {     
        const ordre = req.query.ordre || 'asc';
        // La signe plus convertit la valeur au nombre 
        const limit = +req.query.limit || 1000 ;
        const tri = req.query.tri || "annee";

        const donneesRef = await db.collection("films").orderBy(tri, ordre).limit(limit).get();
        const donneesFinale = [];

        donneesRef.forEach((doc)=>
        {
            donneesFinale.push(doc.data());
        });

        res.statusCode = 200;
        res.json(donneesFinale);
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method GET
 * @param id
 * Permet d'accéder à un film
 */
// : implique que c'est un paramètre, ce qui suive le : est la cle de l'array 'params'
server.get("/films/:id", async(req, res)=>
{
    try 
    {   
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(film)
        {
            res.statusCode = 200;
            res.json(film);
        }
        else
        {
            res.statusCode = 404;
            res.json({ message: "Film non trouvé."});
        }
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'})
    }
});

/**
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/films/initialiser", (req, res)=>
{
    const donnesTest = require("./data/DonneesTest/filmsTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('films').add(element);
    })

    res.statusCode = 200;
    res.json({message: "Données initialisées"})
})

/**
 * @method POST
 * Permet de créer un film
 */
server.post('/films', async (req, res)=>
{
    try
    {    
        const donneesFilm = req.body;

        // Validation des données
        if(donneesFilm.titre == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir un titre.'});
        }

        if(donneesFilm.genre == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir une genre.'});
        }

        if(donneesFilm.description == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir une description.'});
        }

        if(donneesFilm.titreVignette == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir une image.'});
        }

        if(donneesFilm.realisation == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir un réalisateur / une réalisatrice.'});
        }

        if(donneesFilm.annee == undefined)
        {
            res.statusCode = 400;
            return res.json({message: 'Vous devez fournir une année.'});
        }
        
        // Ajouter le fim à la base de données
        await db.collection('films').add(donneesFilm);

        res.statusCode = 201;
        res.json({message: 'la donnée a été ajoutée', donnees: donneesFilm});
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method PUT
 * Permet de modifier un film
 */
server.put('/films/:id', async (req, res)=>
{
   try
   { 
        // Valide si le film existe
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(film)
        {
            const donneeModifiees = req.body;

            // Valide les données
            let valide = true;
            const erreurs = []; 

            Object.keys(donneeModifiees).forEach((cle)=>
            {
                // Valide si les attributes saisies existent à la base de données
                if(!film[cle]) 
                {
                    erreurs.push(cle);
                    valide = false; 

                    res.statusCode = 400;
                    res.json({ message: "Les attributes saisies ne sont pas valides.", erreur: erreurs});

                }
                else
                {
                    // Valide si les attributes ont une valeur 
                    if(donneeModifiees[cle] == '')
                    {
                        erreurs.push(cle);
                        valide = false; 
                        
                        res.statusCode = 400;
                        res.json({ message: "Toutes les attributes saisies doivent avoir une valeur.", erreur: erreurs});
                    }
                }
            })

            // Modifier le film
            if(valide == true)
            {
                await db.collection('films').doc(id).update(donneeModifiees);
        
                res.statusCode = 200;
                res.json({message: "La donnée a été modifée.", donnees: donneeModifiees});
            }
        }
        else
        {
            // Retourne un message si le film n'existe pas
            res.statusCode = 404;
            res.json({ message: "Film non trouvé. "});
        }
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method Delete
 */
server.delete('/films/:id', async (req, res)=>
{
    try{ 
        // Valide si le film existe
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        if(film)
        {
            // Supprime le film si'l existe
            const resultat = await db.collection('films').doc(id).delete();
    
            res.statusCode = 200;
            res.json({message: 'Le film a été supprimé.'})
        }
        else
        {
            // Retourne un message si'l n'existe pas
            res.statusCode = 404;
            res.json({ message: "Film non trouvé. "});
        }
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * Gestion  page 404 - requête non trouvée - doit être le dernier
 */
server.use((req, res)=>
{
    res.statusCode = 404;
    res.render("404", {url: req.url});
})

/**
 * Message de confirmation lors du démarrage du serveur
 */
server.listen(process.env.PORT, ()=>
{
    console.log("Le serveur a démarré.");
});
