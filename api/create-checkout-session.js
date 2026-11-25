import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Catalogue de démonstration : les prix sont définis côté serveur.
const catalog = {
  "produit-demo-1": {
    name: "Produit de démonstration 1",
    price: 1990
  },
  "produit-demo-2": {
    name: "Produit de démonstration 2",
    price: 2990
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) {
      return res.status(500).json({
        error: "Configuration du serveur incomplète."
      });
    }

    const { items, installments } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Panier vide." });
    }

    if (![1, 2, 3, 4].includes(Number(installments))) {
      return res.status(400).json({ error: "Choix de paiement invalide." });
    }

    const line_items = items.map((item) => {
      const product = catalog[item.id];
      const quantity = Number(item.quantity);

      if (
        !product ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20
      ) {
        throw new Error("Article invalide.");
      }

      return {
        quantity,
        price_data: {
          currency: "eur",
          unit_amount: product.price,
          product_data: {
            name: product.name
          }
        }
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      locale: "fr",
      success_url: `${process.env.APP_URL}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/?payment=cancel`,
      metadata: {
        installments: String(installments),
        demo: "true"
      }
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("Erreur Stripe :", error.message);
    return res.status(500).json({
      error: "Impossible de créer le paiement."
    });
  }
}
