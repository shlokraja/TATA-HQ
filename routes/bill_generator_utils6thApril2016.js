/* global require __dirname module console */
'use strict';

var _ = require('underscore');
var pg = require('pg');
var async = require('async');
var format = require('string-format');
var moment = require('moment');
var jsreport = require('jsreport');
var path = require('path');
var fs = require('fs');
var dbUtils = require('../models/dbUtils')

format.extend(String.prototype);
var config = require('../models/config');
var conString = config.dbConn;

var prepare_and_store_bill_data = function(bill_date, outlet_id, callback) {
  debugger;
  pg.connect(conString, function(err, client, done) {
    if (err) {
      callback(err, null);
      return;
    }
    // Aggregate all bills
    var query_text =
    "SELECT \
    (select bill_no from bill_items where sales_order_id= so.id limit 1) as bill_no, \
    soi.sales_order_id as so_id, \
    soi.food_item_id as item_id, \
    coalesce(bi.quantity, soi.quantity) as qty, \
    so.outlet_id as outlet_id, \
    so.time as time, \
    soi.quantity as refund_qty, \
    r.id as fv_id, \
    r.name as fv_name, \
    r.address as fv_address, \
    r.phone_no as fv_phone, \
    r.st_no fv_st_no, \
    r.tin_no as fv_tin_no, \
    fi.name as item_name, \
    fi.mrp as mrp, \
    fi.selling_price as selling_price, \
    fi.service_tax_percent as st_perc, \
    fi.vat_percent as vat_perc, \
    fi.foodbox_fee as foodbox_fee, \
    fi.restaurant_fee as restaurant_fee, \
    fi.side_order as side_order_name, \
    o.start_of_day as start_of_day, \
    o.end_of_day as end_of_day, \
    o.is24hr as is24hr, \
    o.abatement_percent as abatement_perc \
    FROM \
    sales_order_items soi FULL OUTER JOIN \
    bill_items as bi ON bi.sales_order_id = soi.sales_order_id and bi.food_item_id = soi.food_item_id, \
    sales_order as so, \
    restaurant as r, \
    food_item as fi, \
    outlet as o \
    WHERE \
    DATE(so.time) >= $1 \
    AND \
    o.id = $2 \
    AND \
    so.outlet_id = o.id \
    AND \
    soi.sales_order_id = so.id \
    AND \
    coalesce(soi.food_item_id, bi.food_item_id) = fi.id \
    AND \
    r.id = fi.restaurant_id \
    ORDER BY bill_no asc";

    var query_params = [bill_date, outlet_id];

    client.query(query_text, query_params,
      function(query_err, query_res) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          debugger;
          var msg = 'Purchase Orders were issued on this day, but no Sales were made, so there are no bills to display.';
          done();
          var bills = query_res.rows;
          if(bills.length == 0) {
            callback(msg, null);
            return;
          }
          var first = _.first(bills);
          var filteredBills = [];
          if(first.is24hr) {
            filteredBills = _.filter(bills, function(b) {
              return (moment(b.time).format('YYYY-MM-DD') == bill_date);
            });
          } else {
            var last_eod,next_eod = null;
            if(first.start_of_day < first.end_of_day) {
              var prev_day = moment(bill_date).add(-1, 'days').format('YYYY-MM-DD');
              last_eod = moment(prev_day + ' ' + first.end_of_day);
              next_eod = moment(bill_date + ' ' + first.end_of_day).add(1, 'hours');
            } else {
              var next_day = moment(bill_date).add(1, 'days').format('YYYY-MM-DD'); 
              last_eod = moment(bill_date + ' ' + first.end_of_day);
              next_eod = moment(next_day + ' ' + first.end_of_day).add(1, 'hours');
            }

            filteredBills = _.filter(bills, function(b) {
              return moment(b.time).isBetween(last_eod, next_eod);
            }); 
          }
          if(filteredBills.length == 0) {
            callback(msg, null);
            return;
          }
          dbUtils.store_daily_bill(bill_date, outlet_id, filteredBills, callback);
          return;
        }
      });
});
};

var fetch_bill_data = function(bill_date, outlet_id, fv_id, callback) {
  dbUtils.getArchivedBillData(outlet_id, bill_date, function(err, res){
    debugger;
    var msg = 'Purchase Orders were issued on this day, but no Sales were made, so there are no bills to display.';
    if(err){
      callback(msg, null);
      return;
    }
    var consolidated_bills = res;
    if (fv_id) {
      // filter result by fv.
      consolidated_bills = _.filter(res, function(row){
        return (row.fv_id == fv_id);
      });
    }

    if(_.isEmpty(consolidated_bills)) {
      callback(msg, null);
      return;
    }
    callback(null, consolidated_bills);
    return;
  });
};

var get_bill_bundle = function(bill_data, callback) {
  debugger;
  // Group bills by order id and food item id.
  var grouped_bills = [];
  var grouped = _.groupBy(bill_data, function(v) {
    return v.so_id + "#" + v.item_id;
  });
  _.each(_.keys(grouped), function(key){
    var bill = {};
    var orders = grouped[key];
    var sample = _.first(orders);
    
    bill["bill_no"] = sample.bill_no;
    bill["so_id"] = sample.so_id;
    bill["time"] = moment(sample.time);
    bill["qty"] = sample.qty;
    var refunds = _.filter(orders, function(o){
      return (o.refund_qty && (o.refund_qty < 0));
    });
    bill["refund_qty"] = _.reduce(refunds, function(memo, o){
      return memo + o.refund_qty;
    }, 0);
    
    bill["item_id"] = sample.item_id;
    bill["item_name"] = sample.item_name;
    bill["fv_id"] = sample.fv_id;
    bill["fv_name"] = sample.fv_name;
    bill["fv_address"] = sample.fv_address;
    bill["fv_phone"] = sample.fv_phone;
    bill["fv_st_no"] = sample.fv_st_no;
    bill["fv_tin_no"] = sample.fv_tin_no;
    bill["side_order_name"] = sample.side_order_name;
    bill["mrp"] = sample.mrp;
    bill["selling_price"] = sample.selling_price;
    bill["st_perc"] = sample.st_perc;
    bill["vat_perc"] = sample.vat_perc;
    bill["foodbox_fee"] = sample.foodbox_fee;
    bill["restaurant_fee"] = sample.restaurant_fee;
    bill["abatement_perc"] = sample.abatement_perc;
    grouped_bills.push(bill);
  });

  // aggregate by bill no.
  var bills = [];
  var grouped = _.groupBy(grouped_bills, "bill_no");
  _.each(_.keys(grouped), function(bill_no) {
    var entries = grouped[bill_no];
    var fv_grouped = _.groupBy(entries, "fv_id");
    _.each(_.keys(fv_grouped), function(fv_id) {
      var bill = {};
      var first = fv_grouped[fv_id][0];
      bill["bill_no"] = bill_no;
      bill["fv_name"] = first["fv_name"];
      bill["fv_address"] = first["fv_address"] + " Ph:" + first["fv_phone"];
      bill["bill_date"] = moment(first["time"]).format('DD/MM/YYYY');
      bill["bill_time"] = moment(first["time"]).format('HH:mm:ss');
      bill["tin_no"] = first["fv_tin_no"];
      bill["st_no"] = first["fv_st_no"];
      bill["items"] = _.map(fv_grouped[fv_id], function(item) {
        var amount = Number(item.qty + item.refund_qty)*Number(item.selling_price);
        var mrp = Number(item.qty + item.refund_qty)*Number(item.mrp);
        var vat = Number(amount*item.vat_perc/100.0);
        var st = mrp - amount - vat;
        return {
          name: item.item_name,
          qty: item.qty,
          refunds: item.refund_qty,
          amt: amount,
          display_amount: Number(amount.toFixed(2)),
          vat: vat,
          st: st,
          mrp: mrp
        };
      });
      debugger;
      bill["vat_percent"] = (first.vat_perc).toFixed(2);
      bill["st_percent"] = (first.st_perc*first.abatement_perc/100).toFixed(2);

      bill["total"] = _.reduce(bill["items"],
        function(memo, it) { return memo + it.amt;}, 0).toFixed(2);

      bill["vat"] = _.reduce(bill.items, function(memo, it){
        return memo + it.vat;
      }, 0).toFixed(2);

      bill["st"] = _.reduce(bill.items, function(memo, it){
        return memo + it.st;
      }, 0).toFixed(2);

      bill["grand_total"] = _.reduce(bill.items, function(memo, it){
        return memo + it.mrp;
      }, 0);

      bills.push(bill);
    });
});
callback(null, bills);
return;
};

var generate_bill_bundle_pdf = function(bills, callback) {
  var template_path = path.join(__dirname, '/../');
  template_path = path.join(template_path, 'public/reports/bill_bundle.html');
  var content = fs.readFileSync(template_path, 'utf8');
  jsreport.render({
    template: {
      content: content,
      engine: 'jsrender'
    },
    recipe: 'phantom-pdf',
    data: {
      bills: bills
    },
  }).then(function(out) {
    callback(null, out);
  }).catch(function(err) {
    callback(err, null);
    return;
  });
};

module.exports = {
  prepare_and_store_bill_data: prepare_and_store_bill_data,
  fetch_bill_data: fetch_bill_data,
  get_bill_bundle: get_bill_bundle,
  generate_bill_bundle_pdf: generate_bill_bundle_pdf
};