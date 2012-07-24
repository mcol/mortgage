(function() {

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

// principal repayed up to currentPeriod
function cumprinc(payment, rate, currentPeriod, presentValue) {
    return Math.round((payment - presentValue * rate) * s_ni(rate, currentPeriod));
}

// principal to be repaid up to currentPeriod
function remprinc(payment, rate, currentPeriod, presentValue) {
    return presentValue - cumprinc(payment, rate, currentPeriod, presentValue);
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
    this._rate = [];
    this._period = [];
    this._plan = [];
    this._payment = [];
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
        if (!arguments.length) return this._rate[0] * 12 * 100;
        if (value <= 0) {
            this._rate = this._rate.slice(0, 1);
            this._period = this._period.slice(0, 1);
            this._period[0] = this._periods;
            this._plan = this._plan.slice(0, 1);
            this._payment = this._payment.slice(0, 1);
            return this;
        }
        if (arguments.length == 1) {
            this._rate[0] = value / 12 / 100;
            return this;
        }
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

    payment: function() {
        this._plan[0] = pmt(this._rate[0], this._periods, this._amount);
        this._payment[0] = this._plan[0] + this._overpayment;
        if (this._period.length > 1) {
            this._fvp = remprinc(this._plan[0], this._rate[0],
                                 this._period[0], this._amount);
            this._fvo = remprinc(this._payment[0], this._rate[0],
                                 this._period[0], this._amount);
            this._plan[1] = pmt(this._rate[1], this._period[1], this._fvp);
            this._payment[1] = pmt(this._rate[1], this._period[1], this._fvo)
                             + this._overpayment;
        }
        return {
            plan: this._plan,
            actual: this._payment
        };
    },

    principal: function(currentperiod) {
        var prin, plan, pay = this.payment();
        if (currentperiod <= this._period[0]) {
            plan = cumprinc(pay.plan[0], this._rate[0],
                            currentperiod, this._amount);
            prin = cumprinc(pay.actual[0], this._rate[0],
                            currentperiod, this._amount);
        } else {
            var pd = currentperiod - this._period[0];
            plan = cumprinc(pay.plan[1], this._rate[1], pd, this._fvp)
                 + this._amount - this._fvp;
            prin = cumprinc(pay.actual[1], this._rate[1], pd, this._fvo)
                 + this._amount - this._fvo;
        }
        prin = Math.min(prin, this._amount);
        var extra = this._overpayment * currentperiod;
        return {
            planned: plan,
            paid: prin,
            extra: extra,
            left: this._amount - prin
        };
    },

    actualperiods: function() {
        function countPeriods(rate, payment, amount) {
            var num = Math.log(1 - amount / payment * rate);
            var den = Math.log(1 + rate);
            return Math.ceil((-num / den).toFixed(2));
        }
        if (this._period.length == 1)
            return countPeriods(this._rate[0], this._payment[0], this._amount);
        return this._period[0] + countPeriods(this._rate[1], this._payment[1], this._fvo);
    }

};

function plotRepayment(element, mortgage, currentperiod) {
    var principal = mortgage.principal(currentperiod);
    var data = [{width: mortgage.amount(), colour: "lightgrey"},
                {width: principal.paid, colour: "gold"},
                {width: principal.planned, colour: "limegreen"}];

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
        .data([principal.paid, principal.left]).enter()
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
