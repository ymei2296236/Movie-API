const auth = async(req, res, next)=>
{
    if(true)
    {
        next();
    }
    else{
        res.statusCode = 401;
        res.json({"message":"Non autorisé"});
    }
}

module.exports = auth;
