(function() {
"use strict";

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
    return Math.round(presentValue / a_ni(rate, nPeriods));
}

// principal repayed up to period
function cumprinc(payment, rate, period, presentValue) {
    return Math.round((payment - presentValue * rate) * s_ni(rate, period));
}

// principal to be repaid up to period
function remprinc(payment, rate, period, presentValue) {
    return presentValue - cumprinc(payment, rate, period, presentValue);
}

////////////////////////////////

Number.prototype.toCurrency = function() {
    if (!isFinite(this)) return this;
    var self = this.toMoney();
    return parseInt(self).toLocaleString() + "." + self.toFixed(2).slice(-2);
}

Number.prototype.toMoney = function() {
    return Math.round(this) / 100;
}

function setCurrency(currency) {
    return function(amount) {
        return currency + " " + amount.toCurrency();
    }
}

var Mortgage = function() {
    this._amount = 0;
    this._yearlyrate = [];
    this._rate = [];
    this._period = [];
    this._due = { principal: [], payment: [] };
    this._actual = { principal: [], payment: [] };
    this._overpayment = 0;
};

Mortgage.prototype = {

    amount: function(value) {
        if (!arguments.length) return this._amount;
        this._amount = value * 100;
        return this;
    },

    years: function(value) {
        if (!arguments.length) return this._periods / 12;
        this._periods = value * 12;
        if (this._period.length > 1)
            this._period[1] = this._periods - this._period[0];
        else
            this._period[0] = this._periods;
        return this;
    },

    rate: function(value, year) {
        if (!arguments.length) return this._yearlyrate;
        if (value <= 0) {
            this._yearlyrate = this._yearlyrate.slice(0, 1);
            this._rate = this._rate.slice(0, 1);
            this._period = this._period.slice(0, 1);
            this._period[0] = this._periods;
            this._due.payment = this._due.payment.slice(0, 1);
            this._actual.payment = this._actual.payment.slice(0, 1);
            return this;
        }
        if (arguments.length == 1) {
            this._yearlyrate[0] = value;
            this._rate[0] = value / 12 / 100;
            return this;
        }
        this._yearlyrate[1] = value;
        this._rate[1] = value / 12 / 100;
        this._period[0] = year * 12;
        this._period[1] = this._periods - this._period[0];
        return this;
    },

    overpayment: function(value) {
        if (!arguments.length) return this._overpayment;
        this._overpayment = value * 100;
        return this;
    },

    periods: function() {
        return this._period;
    },

    _repaymentplan: function(obj, payment) {
        var pv = this._amount, prin = [0], totalpayment = 0;
        for (var i = 1, pd = 0; pv > payment[pd]; i++) {
            pd = +(i > this._period[0]);
            prin[i] = prin[i - 1] + cumprinc(payment[pd], this._rate[pd], 1, pv);
            totalpayment += payment[pd];
            pv = this._amount - prin[i];
        }
        prin[i] = this._amount;
        obj.principal = prin;
        obj.payment = payment;
        obj.lastpayment = pmt(this._rate[pd], 1, pv);
        obj.totalpayment = totalpayment + obj.lastpayment;
    },

    payment: function() {
        var due = [], actual = [], pd = this._period, fv;
        due[0] = pmt(this._rate[0], this._periods, this._amount);
        actual[0] = due[0] + this._overpayment;
        if (this._period.length > 1) {
            fv = remprinc(due[0], this._rate[0], pd[0], this._amount);
            due[1] = pmt(this._rate[1], pd[1], fv);
            fv = remprinc(actual[0], this._rate[0], pd[0], this._amount);
            actual[1] = pmt(this._rate[1], pd[1], fv) + this._overpayment;
        }
        this._repaymentplan(this._due, due);
        this._repaymentplan(this._actual, actual);
        return {
            due: due,
            actual: actual
        };
    },

    principal: function(currentperiod) {
	var paid = this._actual.principal[currentperiod]
	return {
	    due: this._due.principal[currentperiod],
	    actual: paid,
	    extra: this._overpayment * currentperiod,
	    left: this._amount - paid
	};
    },

    totalpayment: function() {
        return {
            due: this._due.totalpayment,
            actual: this._actual.totalpayment
        };
    },

    actualperiods: function() {
	return this._actual.principal.length - 1;
    }

};

function plotRepayment(element, mortgage, currentperiod) {
    var principal = mortgage.principal(currentperiod);
    var data = [{width: mortgage.amount(), colour: "lightgrey"},
                {width: principal.actual, colour: "gold"},
                {width: principal.due, colour: "limegreen"}];

    var chart = d3.select(element);

    var mar = 20;
    var width = parseInt(chart.style("width"));
    var height = parseInt(chart.style("height"));
    var xScale = d3.scale.linear()
        .domain([0, mortgage.amount()])
        .range([mar, width - 2 * mar]);

    chart.select("svg").remove();
    var svg = chart.append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll(".barchart").data(data).enter()
        .append("rect")
        .attr("x", xScale(0))
        .attr("y", mar)
        .attr("width", function(d) { return xScale(d.width) - mar; })
        .attr("height", height - 2 * mar - 0.5)
        .style("fill", function(d) { return d.colour; })
        .style("stroke", "black")
        .style("stroke-width", 1);

    svg.selectAll("text.labels")
        .data([principal.actual, principal.left]).enter()
        .append("text")
        .attr("class", "axis")
        .attr("x", function(d, i) { return xScale(i ? mortgage.amount() : 0); })
        .attr("y", 18)
        .attr("text-anchor", function(d, i) { return i ? "end" : "start"; })
        .text(function(d) { return currency(d); });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickFormat(function(d) { return currency(d); })
        .ticks(5)
        .tickSubdivide(1);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (height - mar)  + ")")
        .call(xAxis);
}

window.Mortgage = Mortgage;
window.setCurrency = setCurrency;
window.plotRepayment = plotRepayment;

})();
