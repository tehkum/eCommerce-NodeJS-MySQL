var express = require("express");
var router = express.Router();
const nodemailer = require('nodemailer');

// database module
var database = require("../config/database");
var RunQuery = database.RunQuery;

/* Route Home page. */
router.all("/", function (req, res, next) {
    var sqlStr =
        "\
        SELECT *\
        FROM Categories";

    RunQuery(sqlStr, function (categories) {
        sqlStr =
            "\
            SELECT Products.*, Categories.CategoryName, Categories.CategorySlug\
            FROM Products\
            INNER JOIN Categories\
            ON Products.CategoryID = Categories.CategoryID\
            WHERE Feature = 1";

        RunQuery(sqlStr, function (products) {
            var contextDict = {
                currentUrl: "/",
                title: "Home",
                categories: categories,
                featProducts: products,
                customer: req.user,
            };

            //isLoggedIn(req, contextDict);
            res.render("index", contextDict);
        });
    });
});

/* Route Category page. */
router.route("/cat/").all(function (req, res, next) {
    var sqlStr =
        "\
        SELECT *\
        FROM Categories";

    RunQuery(sqlStr, function (categories) {
        var contextDict = {
            currentUrl: "/cat",
            title: "Categories",
            categories: categories,
            customer: req.user,
        };

        res.render("categories", contextDict);
    });
});

/* Route Category Products page. */
// router.route("/cat/:catSlug").all(function (req, res, next) {

//     if (req.params.catSlug == "all") {
//         var selectQuery =
//             "\
//                 SELECT Products.*, Categories.CategoryName, Categories.CategorySlug\
//                 FROM Products\
//                 INNER JOIN Categories\
//                 ON Products.CategoryID = Categories.CategoryID";

//         RunQuery(selectQuery, function (products) {
//             selectQuery =
//                 "\
//                 SELECT *\
//                 FROM Categories";

//             RunQuery(selectQuery, function (categories) {
//                 var contextDict = {
//                     title: "All products",
//                     products: products,
//                     categories: categories,
//                     customer: req.user,
//                 };

//                 res.render("categoryProducts", contextDict);
//             });
//         });
//     } else {
//         var sqlStr =
//             "\
//                 SELECT Products.*, Categories.CategoryName, Categories.CategorySlug\
//                 FROM Products\
//                 INNER JOIN Categories\
//                 ON Products.CategoryID = Categories.CategoryID\
//                 WHERE Categories.CategorySlug = '" +
//             req.params.catSlug +
//             "'";
//             // console.log(products);
//         RunQuery(sqlStr, function (products) {
//             console.log(products == undefined);
//             sqlStr =
//                 "\
//                 SELECT *\
//                 FROM Categories";

//             RunQuery(sqlStr, function (categories) {
//                 var contextDict = {
//                     title: products[0].CategoryName,
//                     products: products,
//                     categories: categories,
//                     customer: req.user,
//                 };
//                 // console.log(products)
//                 if(products.length === 0) {
//                     res.render('/cat/all')
//                 }else{

//                 res.render("categoryProducts", contextDict);}
//             });
//         });
//     }
// });



router.route("/cat/:catSlug").all(function (req, res, next) {
    if (req.params.catSlug == "all") {
        var selectQuery = "\
            SELECT Products.*, Categories.CategoryName, Categories.CategorySlug\
            FROM Products\
            INNER JOIN Categories\
            ON Products.CategoryID = Categories.CategoryID";

        RunQuery(selectQuery, function (products) {
            var selectQuery = "\
                SELECT *\
                FROM Categories";

            RunQuery(selectQuery, function (categories) {
                var contextDict = {
                    title: "All products",
                    products: products,
                    categories: categories,
                    customer: req.user,
                };

                res.render("categoryProducts", contextDict);
            });
        });
    } else {
        var sqlStr = "\
            SELECT Products.*, Categories.CategoryName, Categories.CategorySlug\
            FROM Products\
            INNER JOIN Categories\
            ON Products.CategoryID = Categories.CategoryID\
            WHERE Categories.CategorySlug = '" + req.params.catSlug + "'";

        RunQuery(sqlStr, function (products) {
            var sqlStr = "\
                SELECT *\
                FROM Categories";

            RunQuery(sqlStr, function (categories) {
                if (products.length == 0) {
                    // No products found, render "all" category instead
                    res.redirect('/cat/all');
                } else {
                    var contextDict = {
                        title: products[0].CategoryName,
                        products: products,
                        categories: categories,
                        customer: req.user,
                    };
                    res.render("categoryProducts", contextDict);
                }
            });
        });
    }
});







/* Route Product page. */
router.route("/cat/:catSlug/:prodSlug").all(function (req, res, next) {
    var sqlStr =
        "\
        SELECT *\
        FROM Products\
        WHERE ProductSlug = '" +
        req.params.prodSlug +
        "'";

    RunQuery(sqlStr, function (product) {
        var contextDict = {
            title: product[0].ProductName,
            product: product[0],
            customer: req.user,
        };

        res.render("productDetail", contextDict);
    });
});

router.route("/subscribe").post(function (req, res, next) {
    var sqlStr =
        "\
        INSERT INTO Subscribers\
        VALUES ('" +
        req.body.email +
        "')";

    RunQuery(sqlStr, function (result) {
        res.redirect("/");
    });
});


router.route('/forgot-password')
    .get(function (req, res) {
        var contextDict = {
            title: 'Forgot Password',
            user: req.user
        };
        res.render('forgotPassword', contextDict);
    });

router.route('/forgot-password')
    .post(function (req, res) {
        var contextDict = {
            title: 'Forgot Password',
            user: req.user
        };
        main(req.user).catch(console.error);
        res.redirect('sign-in', contextDict);
    });

// async..await is not allowed in global scope, must use a wrapper
async function main(user) {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
          user: 'gungunSewingClasses@outlook.com',
          pass: 'gungun123@dhirendrapal'
      }
    });
    console.log(user.email)

    let info = await transporter.sendMail({
        from: '"Gungun sewing" <gungunsewingclasses@outlook.com>', // sender address
        to: `${user.Email}`, // list of receivers
        subject: "Forgot Password", // Subject line
        text: `Hello ${user.fullName}, your Passwords is ${user.Password}.`, // plain text body
        html: "<b>Hello world?</b>", // html body
      });
  
    console.log("Message sent: %s", info.messageId);
    console.log("Message sent: %s", info1.messageId);

    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
  
    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  }

  router.route("/youtube").get(function(req,res){
    var sqlStr =
    "\
        SELECT *\
        FROM youtube";
    RunQuery(sqlStr, function (youtube) {
        var contextDict = {
          title: "Admin - Youtube",
          youtube: youtube,
          user: req.user,
        };
    
        res.render("youtube", contextDict);
      });
})

// router.route("/youtube")
//     .get(function(req,res){
//         var contextDict = {
//             title: 'Youtube',
//             youtube: youtube,
//             user: req.user
//         };
//         res.render("youtube");
//         // res.send("<h1>my name is khan</h1>")
// });

module.exports = router;
