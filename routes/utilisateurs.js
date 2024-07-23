const express = require("express");
const server = express.Router();
const db = require("../config/db.js");
const bcrypt = require("bcrypt");
const { check, validationResult } = require("express-validator");
const jwt = require('jsonwebtoken');


/**
 * Points d'accès - Utilisateurs
 */

/**
 * @method POST
 * Permet de s'inscrire
 */
server.post('/inscription', 
[
    // Valide les données saisies
    check("courriel").escape().trim().notEmpty().isEmail().normalizeEmail(),
    check("mdp").escape().trim().notEmpty().isLength({min:8, max:20}).isStrongPassword({minLength:8, minLowercase:1, minNumbers:1, minUppercase:1, minSymbols:1}),
    check('privilege').notEmpty().isNumeric()
],
async (req, res)=>
{
    try
    {   
        const validation = validationResult(req);
        
        // retourne un message lorsqu'une erreur de données 
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        const { courriel, mdp, privilege } = req.body;

        // Valide si l'utilisateur existe
        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
        const utilisateurs = [];

        docs.forEach(async (doc)=>
        {
            const utilisateur = { id: doc.id, ...doc.data()};
            utilisateurs.push(utilisateur);
        })

        // Retourne un message si'l existe déjà
        if(utilisateurs.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: 'L\'utilisateur existe déjà.'});
        }
        else{
            const hash = await bcrypt.hash(mdp, 10);

            // Crée l'utilisateur si tout est valide
            const nouvelUtilisateur = { courriel, mdp: hash, privilege };
            const doc = await db.collection('utilisateurs').add(nouvelUtilisateur);
            
            nouvelUtilisateur.id = doc.id;
            res.statusCode = 200;
            res.json(nouvelUtilisateur);
        }

    }
    catch(e)
    {
        console.log(e);
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * @method POST
 * Permet de se connecter
 */
server.post('/connexion', 
[
    // Valide les données saisies
    check("courriel").escape().trim().notEmpty(),
    check("mdp").escape().trim().notEmpty()
],
async (req, res)=>
{
    try
    {
        const validation = validationResult(req);
        
        // retourne un message lorsqu'une erreur de données 
        if(validation.errors.length > 0)
        {
            res.statusCode = 400;
            return res.json({message: "Données non-conforms"});
        }

        const { courriel, mdp } = req.body;
        
        // Valide si l'utilisateur existe
        const docs = await db.collection("utilisateurs").where("courriel", "==", courriel).get();
        const utilisateurs = [];

        docs.forEach(async(doc)=>
        {
            const utilisateur = {id: doc.id, ...doc.data()};
            utilisateurs.push(utilisateur);
        })

        // Retourne un message si'l n'existe pas
        if(utilisateurs.length != 1 )
        {
            res.statusCode = 400;
            return res.json({message: 'La combinaison de courriel et de mot de passe n\'est pas valide.'});
        }
        
        // Si'l existe
        const utilisateurAValider = utilisateurs[0];

        // Valide si le mot de passe saisi est valide

            const resultatConnexion = await bcrypt.compare(mdp, utilisateurAValider.mdp);
            delete utilisateurAValider.mdp;

            
            if(resultatConnexion)
            {
                // récupère les infos de l'usager
                let roleUser;

                if(utilisateurAValider.privilege == '1') roleUser = 'admin';
                else roleUser = 'user';

                const courrielUser = utilisateurAValider.courriel;


                // générer un jeton
                const donnesJeton = {
                    // test: 'ok',
                    courriel: utilisateurAValider.courriel,
                    id: utilisateurAValider.id
                };

                const options ={
                    expiresIn: "1d" // 1m, 1h 
                }

                const jeton = jwt.sign(
                    donnesJeton,
                    process.env.JWT_SECRET,
                    options
                );


                const infoUsager = { jeton, role: roleUser, courriel: courrielUser};

                res.statusCode = 200;
                res.json(infoUsager);
            }
            else{

                res.statusCode = 400;
                return res.json({message: 'La combinaison de courriel et de mot de passe n\'est pas valide.'});
            }
    }
    catch(e)
    {
        console.log(e);
        res.statusCode = 500;
        res.json({message : 'Une erreur est survenue.'});
    }
})


/**
 * @method POST
 * Initialiser données depuis un fichier vers la base de données
 */
server.post("/initialiser", async(req, res)=>
{
    const donnesTest = require("./data/DonneesTest/utilisateurTest.js");

    donnesTest.forEach(async(element)=>
    {
        await db.collection('utilisateurs').add(element);
    })

    res.statusCode = 200;
    res.json({message: "Données initialisées"})
})

module.exports = server;
