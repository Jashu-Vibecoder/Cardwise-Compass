-- Refresh product identity links to card-specific issuer pages.
-- Reward terms and fees remain unverified and are not represented by this update.
update public.credit_card_catalog
set official_product_url = 'https://www.sbicard.com/en/personal/credit-cards/cashback-sbi-card.html',
    source_url = 'https://www.sbicard.com/en/personal/credit-cards/cashback-sbi-card.html',
    last_verified_at = date '2026-10-25'
where issuer_name = 'SBI Card' and card_name = 'Cashback SBI Card';

update public.credit_card_catalog
set official_product_url = 'https://www.axis.bank.in/cards/credit-card/axis-bank-ace-credit-card',
    source_url = 'https://www.axis.bank.in/cards/credit-card/axis-bank-ace-credit-card',
    last_verified_at = date '2026-10-25'
where issuer_name = 'Axis Bank' and card_name = 'ACE Credit Card';

update public.credit_card_catalog
set official_product_url = 'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card.html',
    source_url = 'https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card.html',
    last_verified_at = date '2026-10-25'
where issuer_name = 'ICICI Bank' and card_name = 'Amazon Pay ICICI Bank Credit Card';
