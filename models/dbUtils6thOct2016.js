/* global require __dirname module console */
'use strict';

var _ = require('underscore');
var pg = require('pg');
var async = require('async');
var format = require('string-format');
var moment = require('moment');

format.extend(String.prototype);
var config = require('../models/config');
var conString = config.dbConn;

var getFvById = function(fv_id, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * FROM restaurant WHERE id = $1",
      [fv_id],
      function(query_err, restaurant) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, restaurant.rows[0]);
          return;
        }
      }
      );
  });
};

var getFVByShortName = function(shortName, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * FROM restaurant WHERE short_name = $1",
      [shortName],
      function(query_err, restaurant) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, restaurant.rows[0]);
          return;
        }
      }
      );
  });
};


var getOutletById = function(outlet_id, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * FROM outlet WHERE id = $1",
      [outlet_id],
      function(query_err, outlet) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, outlet.rows[0]);
          return;
        }
      }
      );
  });
};

var getAllOutlets = function(callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * FROM outlet",
      [],
      function(query_err, outlet) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, outlet.rows);
          return;
        }
      });
  });
};

var getAllFVs = function(outlet_id, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT distinct(restaurant_id) as id FROM food_item WHERE outlet_id=$1",
      [outlet_id],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result);
          return;
        }
      }
      );
  });
};

var getAllOutletsForEntity = function(entity, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT distinct o.* \
      FROM  outlet o, food_item fi, restaurant r \
      WHERE fi.outlet_id = o.id \
      AND fi.restaurant_id = r.id \
      AND r.entity = $1",
      [entity],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      });
  });
};

var getFvByIds = function(fv_ids, callback) {
  var query_params = _.map(_.range(1, fv_ids.length + 1),
    function(i) {
      return '$' + i;
    });

  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    var query_text = "SELECT * FROM restaurant WHERE id in (" + query_params.join(',') + ")";
    client.query( query_text,
      fv_ids,
      function(query_err, restaurant){
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, restaurant.rows);
          return;
        }
      });
  });
};

var getTaxesForOutlet = function(outlet_id, callback) {
  debugger;
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT abt.tds_percent as tds_perc, \
      abt.abatement_percent as abatement_perc, \
      abt.foodbox_service_tax_percent as fbx_st_perc \
      FROM abatements as abt, outlet as o \
      WHERE o.id=$1 AND abt.city = o.city",
      [outlet_id],
      function(query_err, result) {
        debugger;
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows[0]);
          return;
        }
      }
      );
  });
};

var getTaxesForFVs = function (outlet_id, callback) {

    pg.connect(conString, function (err, client, done) {        
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT t.restaurant_id as restaurant_id, \
      t.service_tax_percent as st_perc \
      FROM taxes as t, outlet as o \
      WHERE o.id=$1 AND t.city = o.city",
      [outlet_id],
  function(query_err, result) {
        debugger;
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      }
      );
  });
};

var getTenderTypeRecords = function (outlet_id,from_date,to_date, callback) {
    pg.connect(conString, function (err, client, done) {
        if (err) {
            callback(err, null);
            return;
        }
        
        
        var query = "select * from (\
select o.short_name as outlet_name,to_char(time, 'DD-MM-YYYY') as saledate ,\
sum( case when method=\'cash\' then amount_collected else 0 end) as cash_amount,\
sum( case when method=\'card\' then amount_collected else 0 end) as card_amount,\
sum( case when method=\'sodexocard\' then amount_collected else 0 end) as sodexocard_amount,\
sum( case when method=\'sodexocoupon\' then amount_collected else 0 end) as sodexocoupon_amount,\
sum( case when method=\'credit\' then amount_collected else 0 end) as credit_amount,\
sum( case when method=\'gprscard\' then amount_collected else 0 end) as gprscard_amount,\
sum(amount_collected) total\
        from sales_order s, sales_order_payments p, outlet o where \
        s.id=p.sales_order_id and s.outlet_id=o.id \
        and DATE(time) between DATE($1) and DATE($2)";

        
        if (outlet_id != -1) {
        
            query = query + " and outlet_id="+outlet_id;
        }

        query = query + " group by saledate,o.short_name) as tbl order by saledate ";
        
        console.log("Query----" + query);

        client.query(query,
          [from_date,to_date],
          function (query_err, result) {
              debugger;
              if (query_err) {
                  done(client);
                  callback(query_err, null);
                  return;
              } else {
                  done();
                  callback(null, result.rows);
                  return;
              }
          }
          );
    });
};

var getCashSettlementData = function(outlet_id, date, callback) {
  // Fetch cash settlement data for the date.
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT \
      consolidated_data \
      FROM \
      daily_cash_settlements \
      WHERE \
      DATE(creation_time) = $1 \
      AND \
      outlet_id = $2 \
      ORDER BY \
      last_updated desc \
      LIMIT 1",
      [date, outlet_id],
      function(query_err, query_res){
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else if(! query_res.rows) {
          done();
          callback("Cash settlement data not available", null);
          return;
        } else {
          done();
          if(query_res.rows.length == 0) {
            callback(null, null);
            return;
          }
          var consolidated_data = query_res.rows[0].consolidated_data;
          callback(null, consolidated_data);
          return;
        }
      });
  });
};

var getFVListForReportEmail = function(outlet_id, date, callback) {
  getCashSettlementData(outlet_id, date, function(err, consolidated_data){
    if(err) {
      callback(err, null);
      return;
    }
    // Find all FV ids from consolidated data.
    debugger;
    var fv_ids = _.uniq(_.pluck(consolidated_data.purchase_orders, "restaurant_id"));
    if(fv_ids.length == 0) {
      debugger;
      callback(null, []);
      return;
    }
    getFvByIds(fv_ids, function(err, fv_list){
      if(err) {
        callback(err, null);
        return;
      }
      callback(null, fv_list);
      return;
    });
  });
};

// Report auth.
var getAccountReportUser = function(username, callback){
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * \
      FROM account_reports_user \
      WHERE username = $1",
      [username],
      function(query_err, result) {
        debugger;
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          if(! result.rows) {
            callback(null, null);
            return
          } else {
            callback(null, result.rows[0]);
            return;
          }
        }
      }
      );
  });
};

var getAccountReportUserWithPasswd = function(username, passwd, callback){
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * \
      FROM account_reports_user \
      WHERE username = $1 \
      AND \
      password_hash = crypt($2, password_hash)",
      [username, passwd],
      function(query_err, result) {
        debugger;
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          if(! result.rows) {
            callback(null, null);
            return
          } else {
            callback(null, result.rows[0]);
            return;
          }
        }
      }
      );
  });
};

var getOutletsForCity = function(city_code, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * FROM outlet WHERE city = $1",
      [city_code],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      }
      );
  });
};

var getCarryForward = function(entity, date, city_code, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * \
      FROM ftr_carry_forward \
      WHERE entity=$1 \
      AND \
      DATE(ftr_date) < $2 \
      AND \
      city =$3 \
      ORDER BY ftr_date desc limit 1",
      [entity, date, city_code],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          if(result.rows.length == 0) {
            callback(null, null);
            return;
          }
          callback(null, result.rows[0]);
          return;
        }
      }
      );
  });
};

var addCarryForwards = function(entity, date,
  city_code, carry_forward, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "INSERT INTO ftr_carry_forward \
      (entity, carry_forward, city, ftr_date) \
      VALUES ($1, $2, $3, $4)",
      [entity, carry_forward, city_code, date],

      function(query_err, result) {
        if(query_err) {
          done(client)
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result);
        }
      });
  });
};

var getAllFVsByEntity = function(entity, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT distinct r.* \
      FROM  restaurant r \
      WHERE r.entity = $1",
      [entity],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      });
  });
};

var getSessions = function(outlet_id, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * \
      FROM  menu_bands \
      WHERE outlet_id = $1",
      [outlet_id],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      });
  });
};

var getAllBarcodesForManualFailure = function(outlet_id, callback){
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT \
      po_batch.barcode, \
      po_batch.quantity \
      FROM \
      purchase_order po, \
      purchase_order_batch po_batch \
      WHERE \
      po.outlet_id = $1 \
      AND \
      po_batch.purchase_order_id = po.id \
      AND \
      po_batch.barcode NOT IN \
      (select barcode from sales_order s, sales_order_items si where s.id=si.sales_order_id and s.outlet_id = $1) \
      AND \
      po_batch.barcode NOT IN \
      (select barcode from purchase_order_final_status)",
      [outlet_id],
      function(query_err, result) {
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result.rows);
          return;
        }
      });
  });
};

var store_daily_bill = function(bill_date, outlet_id, filteredBills, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    debugger;
    client.query(
      "INSERT INTO daily_bills \
      (outlet_id, bill_date, consolidated_data) \
      VALUES ($1, $2, $3)",
      [outlet_id, bill_date, JSON.stringify({bills: filteredBills})],

      function(query_err, result) {
        if(query_err) {
          done(client)
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result);
        }
      });
  });  
};

var getArchivedBillData = function(outlet_id, date, callback) {
  // Fetch bill data for the date.
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT \
      consolidated_data \
      FROM \
      daily_bills \
      WHERE \
      bill_date = $1 \
      AND \
      outlet_id = $2 \
      LIMIT 1",
      [date, outlet_id],
      function(query_err, query_res){
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } else if(! query_res.rows) {
          done();
          callback("Bill data not available", null);
          return;
        } else {
          done();
          if(query_res.rows.length == 0) {
            callback(null, null);
            return;
          }
          var consolidated_data = query_res.rows[0].consolidated_data.bills;
          callback(null, consolidated_data);
          return;
        }
      });
  });
};

var store_gofrugal_sales_data = function(d, callback){
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    debugger;
    client.query(
      "INSERT INTO gofrugal_po_sales \
      (sales_date, status, item_id, item_name, quantity, outlet_id, \
        restaurant_id, entity, gross_sales, vat, \
        service_tax, foodbox_fee, restaurant_fee, mrp, \
        session, problem, ispo) \
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
    [d.sales_date, d.status, d.item_id, d.item_name, d.quantity, d.outlet_id,
    d.restaurant_id, d.entity, d.gross_sales, d.vat, d.service_tax,
    d.foodbox_fee, d.restaurant_fee, d.mrp, d.session, d.problem, d.ispo
    ],

    function(query_err, result) {
      if(query_err) {
        done(client)
        callback(query_err, null);
        return;
      } else {
        done();
        callback(null, result);
      }
    });
  });
};

var retrieve_gofrugal_data = function(outlet_id, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    client.query(
      "SELECT * \
      FROM \
      gofrugal_po_sales \
      WHERE \
      outlet_id = $1",
      [outlet_id],
      function(query_err, query_res){
        if(query_err) {
          done(client);
          callback(query_err, null);
          return;
        } 
        callback(null, query_res.rows);       
      });
  });
};

var addDailyCashSettlement = function(outlet_id, date, json_data, callback) {
  pg.connect(conString, function(err, client, done) {
    if(err) {
      callback(err, null);
      return;
    }
    debugger;
    client.query(
      "INSERT INTO daily_cash_settlements \
      (outlet_id, creation_time, consolidated_data, last_updated) \
      VALUES ($1, $2, $3, now())",
      [outlet_id, date, JSON.stringify(json_data)],

      function(query_err, result) {
        if(query_err) {
          done(client)
          callback(query_err, null);
          return;
        } else {
          done();
          callback(null, result);
        }
      });
  });
};

module.exports = {
  getFvById: getFvById,
  getFVByShortName: getFVByShortName,
  getOutletById: getOutletById,
  getAllFVs: getAllFVs,
  getFvByIds: getFvByIds,
  getTaxesForOutlet: getTaxesForOutlet,
  getCashSettlementData: getCashSettlementData,
  getFVListForReportEmail : getFVListForReportEmail,
  getAccountReportUser: getAccountReportUser,
  getAccountReportUserWithPasswd: getAccountReportUserWithPasswd,
  getOutletsForCity: getOutletsForCity,
  getCarryForward: getCarryForward,
  getTaxesForFVs: getTaxesForFVs,
  addCarryForwards: addCarryForwards,
  getAllOutletsForEntity: getAllOutletsForEntity,
  getAllFVsByEntity: getAllFVsByEntity,
  getAllOutlets: getAllOutlets,
  getSessions: getSessions,
  getAllBarcodesForManualFailure: getAllBarcodesForManualFailure,
  store_daily_bill: store_daily_bill,
  getArchivedBillData: getArchivedBillData,
  store_gofrugal_sales_data: store_gofrugal_sales_data,
  retrieve_gofrugal_data: retrieve_gofrugal_data,
  addDailyCashSettlement: addDailyCashSettlement,
    getTenderTypeRecords:getTenderTypeRecords
};
