import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET /api/settings/ea-download?platform=mt4|mt5 - Download EA file
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'mt4';

    if (platform !== 'mt4' && platform !== 'mt5') {
      return NextResponse.json({ error: 'Plateforme invalide' }, { status: 400 });
    }

    // Get user's API key
    const { db, ensureDatabase } = await import('@/lib/db');
    await ensureDatabase();
    const users = await db.$queryRawUnsafe<Array<{ mtApiKey: string | null }>>(
      `SELECT "mtApiKey" FROM users WHERE id = $1`,
      user.id
    );
    const apiKey = users[0]?.mtApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Generez une cle API dabord dans les parametres.' }, { status: 400 });
    }

    // Generate EA code with the user's API key embedded
    const isMT5 = platform === 'mt5';
    const eaCode = generateEA(isMT5, apiKey);

    const filename = isMT5 ? 'TradeVault.mq5' : 'TradeVault.mq4';
    const mimeType = 'text/plain';

    return new NextResponse(eaCode, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[TradeVault] EA download error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

function generateEA(isMT5: boolean, apiKey: string): string {
  const preprocessor = isMT5 ? '#property strict' : '#property strict';
  const webRequestFunc = isMT5
    ? `int res = WebRequest("POST", WEBHOOK_URL, headers, timeout, payload, payloadLen, result, resultLen, "Content-Type: application/json");`
    : `int res = WebRequest("POST", WEBHOOK_URL, payload, payloadLen, result, resultLen, "Content-Type: application/json");`;

  return `//+------------------------------------------------------------------+
//|                                             TradeVault EA           |
//|                        TradeVault SaaS Platform                    |
//|                        MT${isMT5 ? '5' : '4'} Expert Advisor                                 |
//+------------------------------------------------------------------+
${preprocessor}

//--- Configuration
input string API_KEY       = "${apiKey}";  // TradeVault API Key
input string WEBHOOK_URL   = "https://trade-vault-xi.vercel.app/api/webhook/mt4";
input int    SYNC_INTERVAL = 300;         // Sync interval (seconds)
input bool   LOG_VERBOSE   = false;       // Verbose logging

//--- Globals
datetime lastSyncTime = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("[TradeVault] EA initialized - v1.0");
   Print("[TradeVault] Account: ", AccountNumber());
   Print("[TradeVault] Server: ", AccountServer());
   Print("[TradeVault] API Key: ", StringSubstr(API_KEY, 0, 6), "...");
   
   if(API_KEY == "" || API_KEY == "YOUR_API_KEY_HERE")
   {
      Print("[TradeVault] ERROR: Please set your API Key in EA settings!");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   if(!TerminalInfoInteger(TERMINAL_WEBREQUEST_ALLOWED))
   {
      Print("[TradeVault] WARNING: WebRequest not allowed. Enable in Tools->Options->Expert Advisors.");
   }
   
   lastSyncTime = TimeCurrent();
   
   // Send initial sync
   SendSyncRequest();
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                    |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("[TradeVault] EA removed. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                               |
//+------------------------------------------------------------------+
void OnTick()
{
   // Check if sync interval has passed
   if(TimeCurrent() - lastSyncTime >= SYNC_INTERVAL)
   {
      SendSyncRequest();
      lastSyncTime = TimeCurrent();
   }
}

//+------------------------------------------------------------------+
//| Send sync request to TradeVault webhook                             |
//+------------------------------------------------------------------+
void SendSyncRequest()
{
   string headers = "Content-Type: application/json\\r\\n";
   int timeout = 5000;
   char payload[], result[];
   string resultStr = "";
   
   // Scan closed trades and send to webhook
   int total = OrdersHistoryTotal();
   int sent = 0;
   
   for(int i = total - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      
      // Only process trades closed after last sync
      if(OrderCloseTime() <= lastSyncTime && lastSyncTime > 0) continue;
      
      string ticket = IntegerToString(OrderTicket());
      string symbol = OrderSymbol();
      string dir = OrderType() == OP_BUY ? "BUY" : "SELL";
      double entry = OrderOpenPrice();
      double sl = OrderStopLoss();
      double tp = OrderTakeProfit();
      double pnl = OrderProfit() + OrderSwap() + OrderCommission();
      double lots = OrderLots();
      string comment = OrderComment();
      int magic = OrderMagicNumber();
      string openTime = TimeToString(OrderOpenTime(), TIME_DATE|TIME_MINUTES);
      string closeTime = TimeToString(OrderCloseTime(), TIME_DATE|TIME_MINUTES);
      
      // Build JSON payload
      string json = "{";
      json += "\\"apiKey\\":\\"" + API_KEY + "\\",";
      json += "\\"ticket\\":" + ticket + ",";
      json += "\\"symbol\\":\\"" + symbol + "\\",";
      json += "\\"direction\\":\\"" + dir + "\\",";
      json += "\\"entry\\":" + DoubleToString(entry, (StringFind(symbol, "JPY") >= 0 ? 3 : 5)) + ",";
      json += "\\"stopLoss\\":" + (sl > 0 ? DoubleToString(sl, (StringFind(symbol, "JPY") >= 0 ? 3 : 5)) : "0") + ",";
      json += "\\"takeProfit\\":" + (tp > 0 ? DoubleToString(tp, (StringFind(symbol, "JPY") >= 0 ? 3 : 5)) : "0") + ",";
      json += "\\"pnl\\":" + DoubleToString(pnl, 2) + ",";
      json += "\\"lotSize\\":" + DoubleToString(lots, 2) + ",";
      json += "\\"comment\\":\\"" + EscapeJson(comment) + "\\",";
      json += "\\"magicNumber\\":" + IntegerToString(magic) + ",";
      json += "\\"openTime\\":\\"" + openTime + "\\",";
      json += "\\"closeTime\\":\\"" + closeTime + "\\"";
      json += "}";
      
      StringToCharArray(json, payload, 0, WHOLE_ARRAY, CP_UTF8);
      int payloadLen = ArraySize(payload);
      ${webRequestFunc}
      
      if(LOG_VERBOSE)
      {
         resultStr = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
         Print("[TradeVault] Trade #", ticket, " sent. Response: ", resultStr);
      }
      else
      {
         if(res == -1)
            Print("[TradeVault] ERROR: Failed to send trade #", ticket, ". Error: ", GetLastError());
         else
            Print("[TradeVault] Trade #", ticket, " synced successfully.");
      }
      
      sent++;
   }
   
   if(sent > 0)
      Print("[TradeVault] Synced ", sent, " trade(s).");
}

//+------------------------------------------------------------------+
//| Escape JSON special characters                                     |
//+------------------------------------------------------------------+
string EscapeJson(string str)
{
   string result = str;
   StringReplace(result, "\\\\", "\\\\\\\\");
   StringReplace(result, "\\"", "\\\\\\"");
   StringReplace(result, "\\n", "\\\\n");
   StringReplace(result, "\\r", "\\\\r");
   StringReplace(result, "\\t", "\\\\t");
   return result;
}
//+------------------------------------------------------------------+
`;
}
