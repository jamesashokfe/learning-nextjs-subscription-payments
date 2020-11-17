import Link from 'next/link';
import { useState, useEffect } from 'react';
import { postData } from '../utils/helpers';
import { supabase } from '../utils/initSupabase';
import { getStripe } from '../utils/initStripejs';
import { useAuth } from '../utils/useAuth';

export default function Pricing() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  useEffect(() => {
    async function getProducts() {
      // Load all active products and prices.
      const { data: products, error } = await supabase
        .from('products')
        .select('*, prices(*)')
        .eq('active', true)
        .eq('prices.active', true)
        .order('metadata->index')
        .order('unit_amount', { foreignTable: 'prices' });
      if (error) alert(error.message);
      setProducts(products);
      setLoading(false);
    }
    getProducts();
  }, []);

  const handleCheckout = async (event) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.target);
    const price = formData.get('price');
    const { sessionId } = await postData({
      url: '/api/createCheckoutSession',
      data: { price },
      token: session.access_token,
    });
    const stripe = await getStripe();
    const { error } = stripe.redirectToCheckout({ sessionId });
    if (error) alert(error.message);
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      {products.map((product) => (
        <div key={product.id}>
          {product.image ? <img src={product.image} alt={product.name} /> : ''}
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <form onSubmit={handleCheckout}>
            <label htmlFor="price">Choose pricing plan</label>
            <select id="price" name="price">
              {product.prices.map((price) => (
                <option
                  key={price.id}
                  value={price.id}
                >{`${new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: price.currency,
                }).format((price.unit_amount / 100).toFixed(2))} per ${
                  price.interval
                }`}</option>
              ))}
            </select>
            <button type="submit" disabled={!user || loading}>
              Subscribe
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}