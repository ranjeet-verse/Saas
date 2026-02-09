import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useNotification } from '../context/NotificationContext';

const AcceptInvite = () => {
    const { acceptInvite } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { addNotification } = useNotification();

    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        name: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const calculateStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    useEffect(() => {
        setPasswordStrength(calculateStrength(formData.password));
    }, [formData.password]);

    useEffect(() => {
        if (!token) {
            addNotification('Invalid invitation link', 'error');
            navigate('/login');
        }
    }, [token, navigate, addNotification]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            addNotification('Passwords do not match', 'error');
            return;
        }

        if (passwordStrength < 2) {
            setError('Password is too weak');
            addNotification('Please choose a stronger password', 'warning');
            return;
        }

        setLoading(true);
        setError('');

        const result = await acceptInvite(token, {
            name: formData.name,
            password: formData.password
        });

        if (result.success) {
            addNotification('Invitation accepted! Welcome aboard.', 'success');
            navigate('/');
        } else {
            setError(result.error);
            addNotification(result.error, 'error');
        }
        setLoading(false);
    };

    const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md space-y-8 animate-fade-in shadow-2xl">
                <div>
                    <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl mb-4">
                        👋
                    </div>
                    <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
                        Join the team
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Please set up your profile to accept the invitation
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Full Name"
                            name="name"
                            placeholder="John Doe"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <div className="space-y-1">
                            <Input
                                label="Create Password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            {formData.password && (
                                <div className="space-y-1 px-1">
                                    <div className="flex gap-1 h-1.5">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                        Strength: {strengthLabels[passwordStrength - 1] || 'Too Short'}
                                    </p>
                                </div>
                            )}
                        </div>
                        <Input
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm text-center animate-shake">{error}</div>}

                    <div>
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full justify-center py-3 text-lg"
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Accept Invitation'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default AcceptInvite;
