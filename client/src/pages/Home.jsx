import React, { useEffect, useState } from 'react'
import Carousel from '../components/Carousel'
import ShopBy from '../components/ShopBy'
import GenInfo, { Brands } from '../components/GenInfo'
import axios from 'axios'

const Home = () => {
    const [topBrandProducts, setTopBrandProducts] = useState([])
    const [topBrandError, setTopBrandError] = useState(null)

    useEffect(() => {
        let isMounted = true
        const fetchTopBrands = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/filter/bestSellers`)
                if (isMounted) {
                    setTopBrandProducts(res.data)
                    setTopBrandError(null)
                }
            } catch (err) {
                if (isMounted) setTopBrandError(err)
            }
        }
        fetchTopBrands()
        return () => { isMounted = false }
    }, [])

    return (
        <div className='max-w-screen-xl xs:w-[95vw] xs:max-w-[95vw] md:w-full mx-auto '>
            <Carousel />
            <GenInfo />
            <Brands />
            <div className='md:w-full md:max-w-full xs:mx-2  sm:mx-auto '>
                <div className='prose prose-2xl'>
                    {topBrandError ? (
                        <p>Error while fetching: {topBrandError.message}</p>
                    ) : (
                        <>
                            <ShopBy title="Top Brands" products={topBrandProducts} />
                            <ShopBy title="Best Sellers" products={topBrandProducts} />
                        </>
                    )}
                </div>
                <div className='mb-10'>
                    <ShopBy title="Top Rated" filter="topRated" />
                </div>
            </div>
        </div>
    )
}

export default Home