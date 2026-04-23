import { ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import './UserReservations.css';
import axiosInstance from '../../utils/axiosInstance';
import { getFullImageUrl } from '../../utils/getImageURL';
import {
  showErrorNotification,
  showSuccessNotification,
} from '../../utils/notyf';

const UserReservations = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [assetId, setAssetId] = useState(''); // Gunakan string kosong untuk select default
  const [assets, setAssets] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const startRef = useRef(null);
  const endRef = useRef(null);
  const handleStartFocus = () => {
    if (startRef.current) {
      try {
        startRef.current.focus();
        if (typeof startRef.current.showPicker === 'function')
          startRef.current.showPicker();
      } catch (e) {
        /* ignore */
      }
    }
  };
  const handleEndFocus = () => {
    if (endRef.current) {
      try {
        endRef.current.focus();
        if (typeof endRef.current.showPicker === 'function')
          endRef.current.showPicker();
      } catch (e) {
        /* ignore */
      }
    }
  };
  const [loading, setLoading] = useState(false);
  const { search } = useOutletContext() || { search: '' };

  // --- LOGIKA FILTER (Didefinisikan di atas agar bisa dipakai di mana saja) ---
  const filteredAssets = assets.filter((asset) => {
    const q = search?.toLowerCase().trim() || '';
    if (!q) return true;
    return (
      asset.name?.toLowerCase().includes(q) ||
      asset.sku?.toLowerCase().includes(q) ||
      asset.status?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const saveId = localStorage.getItem('rebook_id');
    const resId = localStorage.getItem('res_id');

    if (saveId) {
      console.info('RECOVERING_REBOOK_SESSION', saveId);
      getReservationsDetail(saveId);
      localStorage.removeItem('rebook_id');
    }

    if (resId) {
      console.info('RECOVERING_REBOOK_ID', resId);
      setAssetId(resId); // Langsung set assetId jika datang dari detail
      localStorage.removeItem('res_id');
    }

    getAssets();
  }, []);

  const getAssets = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `${import.meta.env.PUBLIC_API_URL}/api/v1/assets`,
      );
      setAssets(response.data.data || []);
    } catch (error) {
      showErrorNotification(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const getReservationsDetail = async (id) => {
    try {
      const response = await axiosInstance.get(
        `${import.meta.env.PUBLIC_API_URL}/api/v1/reservations/${id}`,
      );
      const reservation = response.data.data;
      setAssetId(reservation.asset_id);
    } catch (error) {
      console.error('DETAIL_FETCH_ERROR', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) return showErrorNotification('PLEASE_SELECT_AN_ASSET');

    try {
      const response = await axiosInstance.post(
        `${import.meta.env.PUBLIC_API_URL}/api/v1/reservations`,
        {
          asset_id: assetId,
          start_date: startDate,
          end_date: endDate,
        },
      );
      showSuccessNotification(
        response.data.message || 'RESERVATION_SUCCESSFUL',
      );
      navigate('/dashboard/history');
    } catch (error) {
      showErrorNotification(
        error.response?.data?.message || 'RESERVATION_FAILED!',
      );
    }
  };

  const scrollLeft = () =>
    scrollRef.current.scrollBy({ left: -230, behavior: 'smooth' });
  const scrollRight = () =>
    scrollRef.current.scrollBy({ left: 230, behavior: 'smooth' });

  const handleAssetDetail = (id) => {
    navigate(`/dashboard/assets/detail/${id}`);
  };

  if (loading) {
    return (
      <div className="edit-assets-container">
        <div className="loading-wrapper">
          <div className="loading-spinner">LOADING_DATA...</div>
          <div className="loading-bar-container">
            <div className="loading-bar-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reservations-wrapper">
      <div className="reservations-header">
        <p>// create</p>
        <h1 className="reservation-title">
          SUBMIT <em>RESERVATION</em>
        </h1>
      </div>
      <main className="reservatiomn-content">
        <form
          onSubmit={handleSubmit}
          id="newReservationForm"
          className="new-reservation"
        >
          <div className="form-grouped">
            <label htmlFor="asset_id">ASSET_IDENTIFICATION</label>
            <select
              name="asset_id"
              id="asset_id"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
            >
              <option value="" disabled>
                =- SELECT_ASSET_AVAILABLE -=
              </option>
              {assets.map((asset) => (
                <option value={asset.id} key={asset.id}>
                  [{asset.sku}] {asset.name} - {asset.status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-grouped">
            <label htmlFor="start-date">START_DATE</label>
            <input
              id="start-date"
              name="start_date"
              className="input-start-date"
              ref={startRef}
              type="date"
              value={startDate}
              onClick={(e) => e.stopPropagation()}
              onFocus={handleStartFocus}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-grouped">
            <label htmlFor="end-date">END_DATE</label>
            <input
              id="end-date"
              name="end_date"
              className="input-end-date"
              ref={endRef}
              type="date"
              value={endDate}
              onClick={(e) => e.stopPropagation()}
              onFocus={handleEndFocus}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="button-res-wrapper">
            <button type="submit" className="btn-add">
              <span>EXECUTE_SUBMIT</span>
            </button>
            <button
              type="reset"
              className="btn-reset"
              onClick={() => setAssetId('')}
            >
              Reset
            </button>
          </div>
        </form>
      </main>

      <div className="reservation-footer">
        <h2>ASSET_INVENTORY_EXPLORER</h2>
        <div className="corousel">
          <div className="left-btn" onClick={scrollLeft}>
            <button type="button">
              <ArrowLeftCircle />
            </button>
          </div>
          <div className="card-scroller">
            <div className="card-asset-wrapper" ref={scrollRef}>
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                  <div
                    className={`card-asset ${asset.status}`}
                    key={asset.id}
                    onClick={() => handleAssetDetail(asset.id)}
                  >
                    <div className="card-asset-header">
                      <img
                        src={getFullImageUrl(asset.image_url)}
                        alt={asset.name}
                        className="card-asset-image"
                      />
                    </div>
                    <div className="card-asset-body">
                      <span className={`card-badge ${asset.status}`}>
                        {asset.status}
                      </span>
                      <h2 className="asset-name">
                        {asset.name}{' '}
                        <span className="asset-id">({asset.id})</span>
                      </h2>
                      <small className="asset-desc">{asset.description}</small>
                    </div>
                    <div className="card-footer">
                      <p className="asset-category">SYSTEM_ASSET</p>
                      <button
                        className="card-select-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssetId(asset.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        SELECT →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">
                  [ NO_ASSETS_MATCHING_SEARCH_QUERY ]
                </div>
              )}
            </div>
          </div>
          <div className="right-btn" onClick={scrollRight}>
            <button type="button">
              <ArrowRightCircle />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserReservations;
