//+------------------------------------------------------------------+
//|                                           TradeVault_EA.mq4      |
//|                        TradeVault - MetaTrader 4 Expert Advisor   |
//|                        Auto-sync trades to TradeVault dashboard   |
//+------------------------------------------------------------------+
#property copyright "TradeVault"
#property link      "https://trade-vault-xi.vercel.app"
#property version   "1.00"
#property strict

// === CONFIGURATION ===
input string WebhookURL    = "https://trade-vault-xi.vercel.app/api/webhook/mt4";
input string ApiKey        = "";  // Your TradeVault API key (from settings)
input bool   SendOnClose   = true; // Send trade data when position closes
input bool   SendOnOpen    = false; // Send trade data when position opens

// === GLOBAL VARIABLES ===
datetime lastSendTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("TradeVault EA initialized. Webhook: ", WebhookURL);
   
   if(ApiKey == "")
   {
      Print("WARNING: No API key set! Go to TradeVault settings to get your API key.");
      Alert("TradeVault EA: Please set your API key in EA settings.");
   }
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                    |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("TradeVault EA removed.");
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   // Check for closed trades
   if(SendOnClose)
   {
      CheckClosedTrades();
   }
}

//+------------------------------------------------------------------+
//| Check recently closed trades and send to webhook                    |
//+------------------------------------------------------------------+
void CheckClosedTrades()
{
   static int lastHistoryCount = 0;
   
   // Get total history deals
   int total = OrdersHistoryTotal();
   
   if(total <= lastHistoryCount)
   {
      lastHistoryCount = total;
      return;
   }
   
   // Process new closed trades
   for(int i = lastHistoryCount; i < total; i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_HISTORY))
      {
         if(OrderType() == OP_BUY || OrderType() == OP_SELL)
         {
            SendTradeToWebhook();
         }
      }
   }
   
   lastHistoryCount = total;
}

//+------------------------------------------------------------------+
//| Send current trade data to TradeVault webhook                      |
//+------------------------------------------------------------------+
void SendTradeToWebhook()
{
   if(ApiKey == "")
   {
      Print("TradeVault: No API key configured.");
      return;
   }
   
   // Rate limit: max 1 request per second
   if(TimeCurrent() - lastSendTime < 1)
   {
      return;
   }
   lastSendTime = TimeCurrent();
   
   string symbol     = OrderSymbol();
   string direction  = OrderType() == OP_BUY ? "BUY" : "SELL";
   double entry      = OrderOpenPrice();
   double stopLoss   = OrderStopLoss();
   double takeProfit = OrderTakeProfit();
   double pnl        = OrderProfit() + OrderSwap() + OrderCommission();
   double lots       = OrderLots();
   int    ticket     = OrderTicket();
   int    magic      = OrderMagicNumber();
   string comment    = OrderComment();
   
   // Format dates as ISO strings
   string openTime  = TimeToString(OrderOpenTime(), TIME_DATE|TIME_MINUTES);
   string closeTime = TimeToString(OrderCloseTime(), TIME_DATE|TIME_MINUTES);
   
   // Calculate pips
   double pips = 0;
   double point = MarketInfo(symbol, MODE_POINT);
   if(OrderType() == OP_BUY)
   {
      pips = (OrderClosePrice() - entry) / point;
   }
   else
   {
      pips = (entry - OrderClosePrice()) / point;
   }
   
   // Normalize pips for 5-digit brokers
   int digits = (int)MarketInfo(symbol, MODE_DIGITS);
   if(digits == 5 || digits == 3)
   {
      pips = pips / 10.0;
   }
   
   // Build JSON payload
   string json = "{";
   json += "\"apiKey\":\"" + ApiKey + "\",";
   json += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"direction\":\"" + direction + "\",";
   json += "\"entry\":" + DoubleToString(entry, digits) + ",";
   json += "\"stopLoss\":" + DoubleToString(stopLoss, digits) + ",";
   json += "\"takeProfit\":" + DoubleToString(takeProfit, digits) + ",";
   json += "\"pnl\":" + DoubleToString(pnl, 2) + ",";
   json += "\"pips\":" + DoubleToString(pips, 1) + ",";
   json += "\"lotSize\":" + DoubleToString(lots, 2) + ",";
   json += "\"magicNumber\":\"" + IntegerToString(magic) + "\",";
   json += "\"comment\":\"" + EscapeJSON(comment) + "\",";
   json += "\"openTime\":\"" + openTime + "\",";
   json += "\"closeTime\":\"" + closeTime + "\"";
   json += "}";
   
   // Send HTTP POST request
   string headers = "Content-Type: application/json\r\n";
   string responseType = "";
   string response = "";
   
   int res = WebRequest(
      "POST",
      WebhookURL,
      headers,
      5000,      // timeout 5 seconds
      json,
      responseType,
      response
   );
   
   if(res == -1)
   {
      int err = GetLastError();
      Print("TradeVault: WebRequest failed. Error: ", err);
   }
   else if(res == 200 || res == 201)
   {
      Print("TradeVault: Trade #", ticket, " synced successfully! PnL: $", DoubleToString(pnl, 2));
   }
   else
   {
      Print("TradeVault: Server returned error ", res, ": ", response);
   }
}

//+------------------------------------------------------------------+
//| Escape special characters for JSON                                  |
//+------------------------------------------------------------------+
string EscapeJSON(string str)
{
   string result = str;
   StringReplace(result, "\\", "\\\\");
   StringReplace(result, "\"", "\\\"");
   StringReplace(result, "\n", "\\n");
   StringReplace(result, "\r", "\\r");
   StringReplace(result, "\t", "\\t");
   return result;
}

//+------------------------------------------------------------------+
//| Trade event handler (MT4 build 600+)                                |
//+------------------------------------------------------------------+
void OnTrade()
{
   CheckClosedTrades();
}

//+------------------------------------------------------------------+
//| Timer function for periodic sync                                    |
//+------------------------------------------------------------------+
void OnTimer()
{
   CheckClosedTrades();
}
//+------------------------------------------------------------------+
