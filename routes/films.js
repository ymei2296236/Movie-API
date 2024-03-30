const express = require("express");
const server = express.Router();
const db = require("../config/db.js");
const auth = require("../middlewares/auth.js");
const { check, validationResult } = require("express-validator");

/**
 * Points d'accès - Films
 */


/**
 * @method GET
 * Permet d'accéder à tous les films
 */
server.get("/", async (req, res)=>
{
    try
    {     
        // La signe plus convertit la valeur au nombre 
        const limite = +req.query.limite || 1000 ;
        const tri = req.query.tri || "annee";
        const ordre = req.query.ordre || 'asc';

        // Controle le champs de tri
        if (tri != "annee" && tri != "titre" && tri != "realisation")
        {
            res.statusCode = 400;
            return res.json({message: `Vous ne pouvez par trier les films par ${tri}.`})
        }

        const donneesRef = await db.collection("films").limit(limite).orderBy(tri, ordre).get();
        const donneesFinale = [];

        donneesRef.forEach((doc)=>
        {
            const filmsAjouter = doc.data();
            filmsAjouter.id = doc.id;

            donneesFinale.push(filmsAjouter);
        });

        res.statusCode = 200;
        res.json(donneesFinale);
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
        console.log(e);
    }
})

/**
 * @method GET
 * @param id
 * Permet d'accéder à un film
 */
// : implique que c'est un paramètre, ce qui suive le : est la cle de l'array 'params'
server.get("/:id", async(req, res)=>
{
    try 
    {   
        const id = req.params.id;
        // valide si le film existe
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        // retourne un message si'l n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé."});
        }

        // retourne le film si'l existe
        res.statusCode = 200;
        res.json(film);
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'})
    }
});

/**
 * @method POST
 * Permet de créer un film
 */
server.post('/', auth,
[
    // valider les données saisies
    check("titre").escape().trim().notEmpty().withMessage('Il faut entrer le titre.').isString(),
    check("genres").escape().trim().notEmpty().isArray({min:1}).withMessage('Il faut choisir au moin une genre.'),
    check("description").escape().trim().notEmpty().withMessage('Il faut entrer une description.').isString(),
    check("titreVignette").escape().notEmpty().withMessage('Il faut choisir une image à téléverser.').isString(),
    check("realisation").escape().trim().notEmpty().withMessage('Il faut entrer le nom du réalisateur.').isString(),
    check("annee").escape().trim().notEmpty().withMessage('Il faut entrer une année.').bail().isISO8601().withMessage('Il faut entrer une année valide.').bail().isLength({max:4}).withMessage('L\'année est de 4 chiffres au maximum.'),
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);
        const erreurs = validation.formatWith(erreur => erreur.msg);

        // retourne un message lorsqu'une erreur de données
        if(!validation.isEmpty())
        {
            res.statusCode = 400;

            return res.json ({erreurs: validation.formatWith(erreur => erreur).array(), message: "Données non-conforms. Veuillez modifier les champs soulignés. "});
        }
        
        const { titre, genres, description, titreVignette, realisation, annee} = req.body;

        // Valide si le film avec le même titre existe
        const docs = await db.collection("films").where("titre", "==", titre).get();

        const films = [];

        docs.forEach((doc)=>
        {
            const film = doc.data();
            films.push(film);
        })

        // retourne un message si'l le film existe déjà
        if(films.length >= 1)
        {
            res.statusCode = 400;
            return res.json({message: 'Le film existe déjà.'});
        }

        // Si tout est correct, ajouter le film à la base de données
        const donneesFilm = { titre, genres, description, titreVignette, realisation, annee};
        const film = await db.collection('films').add(donneesFilm);

        res.statusCode = 201;
        res.json({message: `Le film avec l\'id ${film.id} a été ajouté`});
    }
    catch(e)
    {
        res.statusCode = 500;
        console.log(e);
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method PUT
 * @param id
 * Permet de modifier un film
 */
server.put('/:id', auth,
[
    // valider les données saisies
    check("titre").optional().escape().trim().notEmpty().isString(),
    check("genres").optional().escape().trim().notEmpty().isArray({min:1}).withMessage('Il faut choisir au moin une genre.'),
    check("description").optional().escape().trim().notEmpty().isString(),
    check("titreVignette").optional().escape().trim().notEmpty().isString(),
    check("realisation").optional().escape().trim().notEmpty().isString(),
    check("annee").optional().escape().trim().notEmpty().isISO8601().withMessage('Il faut entrer une année valide.').bail().isLength({max:4}).withMessage('L\'année est de 4 chiffres au maximum.'),
],
async (req, res)=>
{
   try
   { 
        const validation = validationResult(req);
        const erreurs = validation.formatWith(erreur => erreur.msg);

        // retourne un message lorsqu'une erreur de données
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json ({erreurs: validation.formatWith(erreur => erreur).array(), message: "Données non-conforms. Veuillez modifier les champs soulignés. "});
        }
        
        // Valide si le film existe
        const id = req.params.id;
        const donneeModifiees = req.body;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        // Retourne un message si le film n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé. "});
        }

        // Effectue la modification à la base de données
        await db.collection('films').doc(id).update(donneeModifiees);

        res.statusCode = 200;
        res.json({message: `Le film avec l\'id ${id} a été modifié`, donnees: donneeModifiees});
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})

/**
 * @method Delete
 * @param id
 * Permet de supprimer un film
 */
server.delete('/:id', auth, async (req, res)=>
{
    try{ 
        // Valide si le film existe
        const id = req.params.id;
        const doc = await db.collection('films').doc(id).get();
        const film = doc.data();

        // Retourne un message si'l n'existe pas
        if(!film)
        {
            res.statusCode = 404;
            return res.json({ message: "Film non trouvé. "});
        }

        // Supprime le film de la base de données si'l existe
        const resultat = await db.collection('films').doc(id).delete();

        res.statusCode = 200;
        res.json({message: 'Le film a été supprimé.'})
    }
    catch(e)
    {
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/initialiser", auth, async (req, res)=>
{
    const donnesTest = require("../data/DonneesTest/filmsTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('films').add(element);
    })

    res.statusCode = 200;
    res.json({message: "Données initialisées"})
})

module.exports = server;
