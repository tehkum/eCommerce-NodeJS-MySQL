var express = require('express');
var router = express.Router();
const nodemailer = require("nodemailer");

// database module
var database = require('../config/database');
var RunQuery = database.RunQuery;

router.route('/')
    .get(function (req, res, next) {
        req.session.address = {};
        if (req.isAuthenticated()) {
            if (req.session.cart) {
                if (req.session.summary.totalQuantity > 0) {
                    res.redirect('checkout/delivery/')
                }
            }
            res.redirect('/cart');
        }
        else {
            req.session.inCheckOut = true;
            res.redirect('/sign-in');
        }
    });



router.route('/delivery')
    .get(function (req, res, next) {
        req.session.address = {};

        // show addresses
        var selectQuery = '\
            SELECT *\
            FROM Addresses\
            WHERE UserID = ' + req.user.UserID + ';';

        RunQuery(selectQuery, function (rows) {
            req.session.address = rows;
            console.log(req.session.address);

            var contextDict = {
                title: 'Checkout - Delivery Address',
                addresses: rows,
                customer: req.user
            };
            res.render('checkout/delivery', contextDict);
        });
        // if choose from exist address => redirect
        // if create new add
        // 1. Open form
        // 2. Save data
        // 3. Redirect
    });

router.route('/delivery/new')
    .post(function (req, res, next) {
        var fullName = req.body.fullName;
        var email = req.body.email;
        var address = req.body.streetAddress;
        var postcode = req.body.postcode;
        var city = req.body.city;
        var country = req.body.country;
        var phone = req.body.phone;

        // add address
        var insertQuery = '\
            INSERT INTO Addresses\
            VALUES(null, ' +
            req.user.UserID + ', \'' +
            fullName + '\', \'' +
            address + '\', \'' +
            postcode + '\', \'' +
            city + '\', \'' +
            country + '\', \'' +
            phone + '\')';

        RunQuery(insertQuery, function (rows) {
            req.session.address = {
                AddressID: rows.insertId,
                FullName: fullName,
                Email: email,
                StreetAddress: address,
                PostCode: postcode,
                City: city,
                Country: country,
                Phone: phone
            };
            console.log(req.session.address);

            res.redirect('/checkout/review');
        });
    });

router.route('/delivery/:id')
    .post(function (req, res, next) {
        var selectQuery = '\
            SELECT *\
            FROM Addresses\
            WHERE AddressID = ' + req.params.id + ';';

        RunQuery(selectQuery, function (rows) {
            req.session.address = rows[0];
            console.log(req.session.address);
            res.redirect('/checkout/review');
        });
    });

router.route('/review')
    .get(function (req, res, next) {
        //show current cart
        //Order
        var contextDict = {
            title: 'Checkout - Review Order',
            cart: req.session.showCart,
            summary: req.session.cartSummary,
            address: req.session.address,
            customer: req.user
        };
        res.render('checkout/review', contextDict);
    });

router.route('/order')
    .get(function (req, res, next) {
        var insertQuery = '\
            INSERT INTO Orders\
            VALUES(null, ' +
            req.user.UserID + ', ' +
            req.session.address.AddressID + ', ' +
            req.session.cartSummary.subTotal + ', ' +
            req.session.cartSummary.discount + ', ' +
            req.session.cartSummary.shipCost + ', ' +
            req.session.cartSummary.total + ', NOW(), \'Order Received\');';

        RunQuery(insertQuery, function (rows) {
            console.log(req.session.cart);
            for (var item in req.session.cart) {
                console.log(item);
                if (req.session.cart[item].quantity > 0) {

                    insertQuery = '\
                        INSERT INTO `Order Details`\
                        VALUES(' +
                        rows.insertId + ', ' +
                        req.session.cart[item].ProductID + ', ' +
                        req.session.cart[item].quantity + ', ' +
                        req.session.cart[item].productTotal + ');';

                    updateQuery = 'UPDATE Products\
                            SET UnitsInStock = (UnitsInStock - ' + req.session.cart[item].quantity +
                        ') WHERE ProductID = ' + req.session.cart[item].ProductID;

                    RunQuery(insertQuery, function (result) {
                        RunQuery(updateQuery, function (result2) {
                        })
                    });
                }
            }

            //view order

            //get order info
            var selectQuery = '\
            SELECT *\
            FROM Orders\
            WHERE OrderID = ' + rows.insertId;

            RunQuery(selectQuery, function (order) {
                //get delivery info
                selectQuery = '\
                SELECT *\
                FROM Addresses\
                WHERE AddressID = ' + order[0].AddressID;

                RunQuery(selectQuery, function (address) {
                    //get order info
                    selectQuery = '\
                    SELECT *\
                    FROM `Order Details`\
                    INNER JOIN (\
                        SELECT Products.*, Categories.CategorySlug\
                        FROM Products\
                        INNER JOIN Categories\
                        ON Products.CategoryID = Categories.CategoryID\
                    ) `Table`\
                    ON `Order Details`.ProductID = `Table`.ProductID\
                    WHERE OrderID = ' + order[0].OrderID;

                    RunQuery(selectQuery, function (products) {
                        //clear cart
                        req.session.cart = {};
                        req.session.summary = {
                            totalQuantity: 0,
                            subTotal: 0.00,
                            discount: 0.00,
                            shipCost: 0.00,
                            total: 0.00
                        };
                        req.session.cartSummary = {};
                        req.session.showCart = {};
                        req.session.address = {};

                        //get order info
                        var contextDict = {
                            title: 'Order #' + rows.insertId,
                            customer: req.user,
                            order: order[0],
                            address: address[0],
                            products: products
                        };
                        // (error, results) => {
                        //     if (error) {
                        //       res.render("/",{
                        //         title: "error"
                        //       });
                        //       console.log(error);
                        //     } else {
                        //       res.render("checkout/confirm", contextDict);
                        //     }
                        //   }
                        console.log("Checkout Page Called!");
                        main().catch(console.error);
                        // res.status(200).render('checkout/confirm', contextDict);
                        res.redirect('/checkout/confirm/' + rows.insertId);
                    });
                });
            });
        });
    });










// router.route('/order')
// .get(function (req, res, next) {
//     // existing code to process form data and insert order into database

//     // redirect to new page with order ID as parameter

// });

router.route('/confirm/:id')
    .get(function (req, res, next) {
        // retrieve order details using ID passed in URL
        var orderId = req.params.id;
        var selectQuery = '\
            SELECT *\
            FROM Orders\
            WHERE OrderID = ' + orderId;

        RunQuery(selectQuery, function (order) {
            //get delivery info
            selectQuery = '\
            SELECT *\
            FROM Addresses\
            WHERE AddressID = ' + order[0].AddressID;

            RunQuery(selectQuery, function (address) {
                //get order info
                selectQuery = '\
                SELECT *\
                FROM `Order Details`\
                INNER JOIN (\
                    SELECT Products.*, Categories.CategorySlug\
                    FROM Products\
                    INNER JOIN Categories\
                    ON Products.CategoryID = Categories.CategoryID\
                ) `Table`\
                ON `Order Details`.ProductID = `Table`.ProductID\
                WHERE OrderID = ' + order[0].OrderID;

                RunQuery(selectQuery, function (products) {
                    //clear cart
                    req.session.cart = {};
                    req.session.summary = {
                        totalQuantity: 0,
                        subTotal: 0.00,
                        discount: 0.00,
                        shipCost: 0.00,
                        total: 0.00
                    };
                    req.session.cartSummary = {};
                    req.session.showCart = {};
                    req.session.address = {};
                    req.session.discount = {};

                    //get order info
                    var contextDict = {
                        title: 'Order #' + orderId,
                        customer: req.user,
                        order: order[0],
                        address: address[0],
                        products: products
                    };

                    res.render('checkout/confirm', contextDict);
                });
            });
        });
    });





















// async..await is not allowed in global scope, must use a wrapper
async function main(user, orderId) {
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
    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: '"Gungun sewing classes 👻" <gungunsewingclasses@outlook.com>', // sender address
        to: "gungunsewingclasses@outlook.com", // list of receivers
        subject: "Hello ✔", // Subject line
        text: "Hello world?", // plain text body
        html: "<b>Hello world?</b>", // html body
    });

    let info1 = await transporter.sendMail({
        from: '"Gungun sewing" <gungunsewingclasses@outlook.com>', // sender address
        to: `${user.Email}`, // list of receivers
        subject: `#Order${orderId} Confirmation`, // Subject line
        text: `Hello ${user.fullName}, your Item will be delievered in this week.`, // plain text body
        html: "<b>Hello world?</b>", // html body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Message sent: %s", info1.messageId);

    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

module.exports = router;