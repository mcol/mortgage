"use strict";

test("Basic methods", function() {

    var m = new Mortgage();
    m.amount(80000)
     .years(15)
     .rate(3.39)
     .rate(3.99, 2);

    deepEqual(m.periods(), [24, 156], "Number of periods");
    deepEqual(m.rate(), [3.39, 3.99], "Rates");
    deepEqual(m.actualperiods(), 180, "Actual periods");
 
    m.rate(8, 3);
    deepEqual(m.periods(), [36, 144], "Number of periods");
    deepEqual(m.rate(), [3.39, 8], "Rates");
  
    m.rate(0);
    deepEqual(m.periods(), [180], "Periods after removing a rate");
    deepEqual(m.rate(), [3.39], "Rates after removing a rate");

});

test("Adding and removing rates", function() {

    var m = new Mortgage();
    m.amount(80000)
     .rate(3.99, 5);

    deepEqual(m.periods(), [60, 0], "Number of periods");
    deepEqual(m.rate(), [3.99, 3.99], "Rates");

    m.rate(0);
    deepEqual(m.periods(), [undefined], "Periods after removing a rate");
    deepEqual(m.rate(), [3.99], "Rates after removing a rate");

    m.rate(4.99, 6);
    deepEqual(m.periods(), [72, 0], "Number of periods");
    deepEqual(m.rate(), [3.99, 4.99], "Rates");

    m.years(10);
    deepEqual(m.periods(), [72, 48], "Number of periods");

    m.rate(5, 0);
    deepEqual(m.periods(), [120], "Number of periods");
    deepEqual(m.rate(), [3.99], "Rates after removing a rate");

});

test("Fixed rate payments", function() {

    var m = new Mortgage();
    m.amount(80000)
     .years(15)
     .rate(3.39)
     .overpayment(50);

    var p = m.payment();
    var pp = m.paymentplan();
    var tp = m.totalpayment();
    deepEqual(p.due, [56759], "Payment due");
    deepEqual(pp.due.lastpayment, 56861, "Last payment due");
    deepEqual(tp.due, 10216722, "Total payment due");
    deepEqual(p.actual, [61759], "Actual payment");
    deepEqual(pp.actual.lastpayment, 31233, "Last actual payment");
    deepEqual(tp.actual, 9974432, "Total actual payment");
    deepEqual(m.actualperiods(), 162, "Actual periods");

    var pr = m.principal(50);
    deepEqual(pr.due, 1831685, "Due principal");
    deepEqual(pr.actual, 2099798, "Actual principal");
    deepEqual(pr.extra, 250000, "Extra payments");

    pr = m.principal(m.actualperiods());
    deepEqual(pr.due, 7005151, "Due principal");
    deepEqual(pr.actual, 8000000, "Actual principal");
    deepEqual(pr.extra, 805000, "Extra payments");

});

test("Variable rate payments", function() {

    var m = new Mortgage();
    m.amount(80000)
     .years(15)
     .rate(3.39)
     .rate(3.99, 2)
     .overpayment(50);

    var p = m.payment();
    var pp = m.paymentplan();
    var tp = m.totalpayment();
    deepEqual(p.due, [56759, 58842], "Payment due");
    deepEqual(pp.due.lastpayment, 58902, "Last payment due");
    deepEqual(pp.due.lastextra, 0, "Extra payment due");
    deepEqual(tp.due, 10541628, "Total payment due");
    deepEqual(p.actual, [61759, 62822], "Actual payment");
    deepEqual(pp.actual.lastpayment, 10035, "Last actual payment");
    deepEqual(tp.actual, 10287331, "Total actual payment");
    deepEqual(m.actualperiods(), 165, "Actual periods");

    var pr = m.principal(50);
    deepEqual(pr.due, 1797437, "Due principal");
    deepEqual(pr.actual, 2040492, "Actual principal");
    deepEqual(pr.extra, 250000, "Extra payments");
    deepEqual(pr.left, 5959508, "Left to pay");

    var pr = m.principal(m.actualperiods());
    deepEqual(pr.due, 7140354, "Due principal");
    deepEqual(pr.actual, 8000000, "Actual principal");
    deepEqual(pr.extra, 820000, "Extra payments");
    deepEqual(pr.left, 0, "Left to pay");

});

test("Edge cases for extra payments", function() {

    var m = new Mortgage();
    m.amount(80000)
     .years(5)
     .rate(3.39)
     .rate(3.99, 4)
     .overpayment(800);

    var p = m.payment();
    var pp = m.paymentplan();
    var tp = m.totalpayment();
    deepEqual(p.due, [145140, 145609], "Payment due");
    deepEqual(pp.due.lastpayment, 145615, "Last payment due");
    deepEqual(pp.due.lastextra, 0, "Extra payment due");
    deepEqual(tp.due, 8714034, "Total payment due");
    deepEqual(p.actual, [225140], "Actual payment");
    deepEqual(pp.actual.lastpayment, 112405, "Last actual payment");
    deepEqual(tp.actual, 8442585, "Total actual payment");
    deepEqual(m.actualperiods(), 38, "Actual periods");

    var pr = m.principal(50);
    deepEqual(pr.due, 6570183, "Due principal after more than actual periods");
    deepEqual(pr.actual, 8000000, "Actual principal after more than actual periods");
    deepEqual(pr.extra, 2960000, "Extra payments after more than actual periods");
    deepEqual(pr.left, 0, "Left to pay");

    var pr = m.principal(m.actualperiods());
    deepEqual(pr.due, 4908340, "Due principal at actual periods");
    deepEqual(pr.actual, 8000000, "Actual principal at actual periods");
    deepEqual(pr.extra, 2960000, "Extra payments at actual periods");
    deepEqual(pr.left, 0, "Left to pay");

    m.overpayment(725);

    var p = m.payment();
    var pp = m.paymentplan();
    var tp = m.totalpayment();
    deepEqual(p.actual, [217640], "Actual payment");
    deepEqual(pp.actual.lastpayment, 188202, "Last actual payment");
    deepEqual(tp.actual, 8458522, "Total actual payment");
    deepEqual(m.actualperiods(), 39, "Actual periods");

    var pr = m.principal(m.actualperiods() - 1);
    deepEqual(pr.due, 4908340, "Due principal at actual periods - 1");
    deepEqual(pr.actual, 7812328, "Actual principal at actual periods - 1");
    deepEqual(pr.extra, 2755000, "Extra payments at actual periods - 1");
    deepEqual(pr.left, 187672, "Left to pay");

    var pr = m.principal(m.actualperiods());
    deepEqual(pr.due, 5044746, "Due principal at actual periods");
    deepEqual(pr.actual, 8000000, "Actual principal at actual periods");
    deepEqual(pr.extra, 2798062, "Extra payments at actual periods");
    deepEqual(pr.left, 0, "Left to pay");

});
