// present value of an annuity-immediate
function a_ni(rate, nPeriods) {
    return (1 - Math.pow(1 + rate, -nPeriods)) / rate;
}

// future value of an annuity-immediate
function s_ni(rate, nPeriods) {
    return (Math.pow(1 + rate, nPeriods) - 1) / rate;
}

// compute monthly payment
function pmt(rate, nPeriods, presentValue) {
    return presentValue / a_ni(rate, nPeriods);
}

// principal repayed up to currentPeriod
function cumprinc(payment, rate, currentPeriod, presentValue) {
    return (payment - presentValue * rate) * s_ni(rate, currentPeriod);
}

// principal to be repaid up to currentPeriod
function remprinc(payment, rate, currentPeriod, presentValue) {
    return presentValue - cumprinc(payment, rate, currentPeriod, presentValue);
}

////////////////////////////////

Number.prototype.toMoney = function() {
    if (!isFinite(this)) return this;
    return parseInt(this).toLocaleString() + "." + this.toFixed(2).slice(-2);
}

function setCurrency(currency) {
    return function(amount) {
        return currency + " " + amount.toMoney();
    }
}

function clamp(val, min, max) {
    if (isNaN(val) || val == "")
        val = 0;
    if (val < min)
        return min;
    if (val > max)
        return max;
    return val;
}

function computePeriods(amount, totalPayment, monthlyRate) {
    var num = Math.log(1 - amount / totalPayment * monthlyRate);
    var den = Math.log(1 + monthlyRate);
    return Math.ceil((-num / den).toFixed(2));
}

function computePayment(data) {
    var m = data;
    m.monthlyRate = m.rate / 12 / 100;
    m.monthlyNextRate = m.nextrate / 12 /100;
    m.firstperiods = m.nextrateyear * 12;
    m.nextperiods = (m.years - m.nextrateyear) * 12;
    m.periods = m.firstperiods + m.nextperiods;
    m.payment = pmt(m.monthlyRate, m.periods, m.amount);
    m.orignextamount = remprinc(m.payment, m.monthlyRate,
                                m.firstperiods, m.amount);
    m.nextamount = remprinc(m.payment + m.overpayment, m.monthlyRate,
                            m.firstperiods, m.amount);
    m.orignextpayment = pmt(m.monthlyNextRate, m.nextperiods, m.orignextamount);
    m.nextpayment = pmt(m.monthlyNextRate, m.nextperiods, m.nextamount);
    m.actualperiods = m.firstperiods + computePeriods(m.nextamount, m.nextpayment + m.overpayment, m.monthlyNextRate);
    return m;
}

function computeRepayment(mortgage, currentperiod) {
    var principal, origprincipal;
    if (currentperiod <= mortgage.firstperiods) {
        principal = cumprinc(mortgage.payment + mortgage.overpayment,
                             mortgage.monthlyRate,
                             currentperiod, mortgage.amount);
        origprincipal = cumprinc(mortgage.payment,
                                 mortgage.monthlyRate,
                                 currentperiod, mortgage.amount);
    } else {
        principal = cumprinc(mortgage.nextpayment + mortgage.overpayment,
                             mortgage.monthlyNextRate,
                             currentperiod - mortgage.firstperiods,
                             mortgage.nextamount);
        principal += mortgage.amount - mortgage.nextamount;
        origprincipal = cumprinc(mortgage.orignextpayment,
                                 mortgage.monthlyNextRate,
                                 currentperiod - mortgage.firstperiods,
                                 mortgage.orignextamount);
        origprincipal += mortgage.amount - mortgage.orignextamount;
    }
    principal = Math.min(principal, mortgage.amount);
    return {
        'principal': principal,
        'origprincipal': origprincipal,
        'extra': mortgage.overpayment * currentperiod,
        'remaining': mortgage.amount - principal
    }
}

function plotRepayment(element, repayment) {
    var data = [{width: amount, colour: "lightgrey"},
                {width: repayment.principal, colour: "gold"},
                {width: repayment.origprincipal, colour: "limegreen"}];

    var chart = d3.select(element);

    var width = parseInt(chart.style("width"));
    var height = parseInt(chart.style("height"));
    var xScale = d3.scale.linear()
        .domain([0, amount])
        .range([0, width]);

    chart.select("svg").remove();
    var svg = chart.append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll(".barchart").data(data).enter()
        .append("rect")
        .attr("x", xScale(0))
        .attr("y", 0.5)
        .attr("width", function(d) { return xScale(d.width); })
        .attr("height", height - 0.5)
        .style("fill", function(d) { return d.colour; })
        .style("stroke", "black")
        .style("stroke-width", 1);
}
