import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validSignature, capturedForOrder } from "../lib/verification.ts";

test("a checkout signature binds the stored order to the payment",()=>{
  const pair="order_example|pay_example";
  const signature=createHmac("sha256","test-secret").update(pair).digest("hex");
  assert.ok(validSignature("test-secret",pair,signature));
  assert.equal(validSignature("test-secret","order_other|pay_example",signature),false);
  assert.equal(validSignature("test-secret",pair,"invalid"),false);
});
test("webhooks require the exact original request bytes and the webhook secret",()=>{
  const raw=Buffer.from('{"event": "payment.captured"}');
  const signature=createHmac("sha256","webhook-secret").update(raw).digest("hex");
  assert.ok(validSignature("webhook-secret",raw,signature));
  assert.equal(validSignature("checkout-secret",raw,signature),false);
  assert.equal(validSignature("webhook-secret",JSON.stringify(JSON.parse(raw)),signature),false);
  assert.equal(validSignature("webhook-secret",raw,null),false);
});
const valid={id:"pay_a",order_id:"order_a",amount:1000,currency:"INR",status:"captured",captured:true};
test("requires full INR capture for the matching payment and order",()=>{
  assert.ok(capturedForOrder(valid,"order_a","pay_a"));
  for(const change of [{status:"failed"},{status:"authorized"},{status:"created"},{captured:false},{amount:100},{currency:"USD"},{order_id:"order_b"},{id:"pay_b"}]){
    assert.equal(capturedForOrder({...valid,...change},"order_a","pay_a"),false);
  }
});
