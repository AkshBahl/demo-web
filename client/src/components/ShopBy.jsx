import axios from 'axios';
import React, { useEffect, useState } from 'react'
import HorSlider from './HorSlider';

const ShopBy = ({ filter, title, products: productsProp }) => {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (Array.isArray(productsProp)) {
            setProducts(productsProp);
            setError(null);
            setLoading(false);
            return;
        }

        let isMounted = true;
        const fetchData = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/filter/${filter}`);
                if (isMounted) {
                    setProducts(res.data);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    console.error(`Error while fetching products: ${err.message}`);
                    setError(err);
                    setLoading(false);
                }

            }
        }
        fetchData();
        return () => {
            isMounted = false;
        }
    }, [filter, productsProp])

    return (
        <>
            <div className='mt-10 mb-2 text-2xl'>{title}</div>
            <div className='overflow-x-auto overflow-y-hidden md:max-w-full scroll-container mb-10 mx-auto relative scroll-container'>
                {loading && <p>Loading...</p>}
                {error && <p>Error while fetching: {error.message}</p>}
                <div className='flex flex-nowrap space-x-4 '>
                    {products.map(elem => (
                        <HorSlider product={elem} key={elem._id} className="inline-block" home={true} />
                    ))}
                </div>
                
            </div>
        </>

    )
}

export default ShopBy